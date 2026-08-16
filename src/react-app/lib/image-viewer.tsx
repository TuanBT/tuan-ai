import { useCallback, useState, type ReactNode } from "react";
import { Lightbox } from "../components/Lightbox";

interface Viewing {
	images: string[];
	index: number;
}

/**
 * Móc nối để chạm vào một tấm ảnh là xem được cả tấm.
 *
 * Trả về hàm mở khung và phần khung để đặt vào cuối trang; nơi dùng chỉ cần
 * biết danh sách ảnh của khối đó và vị trí tấm vừa được chạm, không phải tự giữ
 * trạng thái nào cả.
 */
export function useImageViewer(): {
	view: (images: string[], index: number) => void;
	viewer: ReactNode;
} {
	const [viewing, setViewing] = useState<Viewing | null>(null);

	const view = useCallback((images: string[], index: number) => {
		if (images.length) setViewing({ images, index });
	}, []);

	const viewer = viewing ? (
		<Lightbox
			images={viewing.images}
			index={viewing.index}
			onMove={(index) =>
				setViewing((current) => current && { ...current, index })
			}
			onClose={() => setViewing(null)}
		/>
	) : null;

	return { view, viewer };
}
