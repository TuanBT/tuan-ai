/**
 * Tầng lưu ảnh.
 *
 * Hiện chạy trên KV vì KV không cần thẻ tín dụng. Khi lượng bài vượt hạn mức
 * (xem trang Thống kê trong /admin), đổi sang R2 bằng cách thay `kvBlobs` bằng
 * `r2Blobs` ở cuối file, phần còn lại của ứng dụng không phải sửa gì.
 */

export interface StoredBlob {
	data: ArrayBuffer;
	contentType: string;
}

export interface Blobs {
	put(
		key: string,
		data: ArrayBuffer,
		contentType: string,
		ttlSeconds: number,
	): Promise<void>;
	get(key: string): Promise<StoredBlob | null>;
	delete(key: string): Promise<void>;
}

function kvBlobs(kv: KVNamespace): Blobs {
	return {
		async put(key, data, contentType, ttlSeconds) {
			await kv.put(key, data, {
				// KV tự xoá khi hết hạn, và việc tự xoá này không tính vào
				// hạn mức xoá hằng ngày.
				expirationTtl: Math.max(60, ttlSeconds),
				metadata: { contentType },
			});
		},
		async get(key) {
			const found = await kv.getWithMetadata<{ contentType?: string }>(
				key,
				"arrayBuffer",
			);
			if (!found.value) return null;
			return {
				data: found.value,
				contentType: found.metadata?.contentType ?? "application/octet-stream",
			};
		},
		async delete(key) {
			await kv.delete(key);
		},
	};
}

/**
 * Bản dùng R2. Để bật: khai báo r2_bucket trong wrangler.json với binding
 * `UPLOADS`, rồi đổi dòng cuối file thành `return r2Blobs(env.UPLOADS)`.
 * Với R2 thì hạn TTL do lifecycle rule của bucket lo, nên `ttlSeconds` bỏ qua.
 */
export function r2Blobs(bucket: R2Bucket): Blobs {
	return {
		async put(key, data, contentType) {
			await bucket.put(key, data, { httpMetadata: { contentType } });
		},
		async get(key) {
			const object = await bucket.get(key);
			if (!object) return null;
			return {
				data: await object.arrayBuffer(),
				contentType:
					object.httpMetadata?.contentType ?? "application/octet-stream",
			};
		},
		async delete(key) {
			await bucket.delete(key);
		},
	};
}

export function blobs(env: Env): Blobs {
	return kvBlobs(env.IMAGES);
}

export function imageKey(code: string, index: number): string {
	return `img/${code}/${index}`;
}
