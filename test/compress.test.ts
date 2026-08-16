import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImage, ImageError } from "../src/react-app/lib/compress";

/**
 * Canvas giả, đủ để `compressImage` chạy hết đường: vẽ xong rồi xuất ra một blob
 * có kích thước do bài kiểm tra đặt.
 */
function fakeCanvas(blobSize: number) {
	return {
		width: 0,
		height: 0,
		getContext: () => ({ drawImage: () => {} }),
		toBlob: (cb: (blob: Blob | null) => void) =>
			cb({ size: blobSize } as Blob),
	};
}

function stubBitmap(width = 1200, height = 900) {
	vi.stubGlobal("createImageBitmap", async () => ({
		width,
		height,
		close: () => {},
	}));
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("nén ảnh trước khi gửi", () => {
	it("ảnh trình duyệt không giải mã được thì báo image_read", async () => {
		vi.stubGlobal("createImageBitmap", async () => {
			throw new DOMException("decode", "InvalidStateError");
		});

		const err = await compressImage(new File([], "anh.heic")).catch((e) => e);
		expect(err).toBeInstanceOf(ImageError);
		// Trước đây mọi lỗi ở đây đều ra "ảnh quá nặng", nên người dùng đi nén ảnh
		// nhỏ lại rồi gặp lại đúng câu đó.
		expect(err.code).toBe("image_read");
	});

	it("ảnh nén hết cỡ vẫn quá nặng thì báo image_size", async () => {
		stubBitmap();
		vi.stubGlobal("document", {
			createElement: () => fakeCanvas(5_000_000),
		});

		const err = await compressImage(new File([], "anh.jpg")).catch((e) => e);
		expect(err).toBeInstanceOf(ImageError);
		expect(err.code).toBe("image_size");
	});

	it("ảnh vừa tầm thì trả về tệp JPG", async () => {
		stubBitmap();
		vi.stubGlobal("document", {
			createElement: () => fakeCanvas(200_000),
		});

		const out = await compressImage(new File([], "ảnh chụp.HEIC"));
		expect(out.type).toBe("image/jpeg");
		// Máy chủ chỉ nhận ba định dạng cũ, nên dù người dùng chọn tấm HEIC từ
		// iPhone thì thứ đi lên vẫn phải là JPG.
		expect(out.name).toBe("ảnh chụp.jpg");
	});
});
