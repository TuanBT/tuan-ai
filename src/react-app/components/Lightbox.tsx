import { useCallback, useEffect, useRef } from "react";
import { useLang } from "../lib/lang-context";

/**
 * Khung xem một tấm ảnh, phủ kín màn hình.
 *
 * Ảnh ở mọi chỗ trong trang đều là ô vuông cắt cúp cỡ vài chục điểm ảnh: đủ để
 * nhận ra mình đã chọn tấm nào, không đủ để xem lại thật sự. Mở khung này bằng
 * `useImageViewer`, đừng dựng thẳng ở nơi dùng.
 */
export function Lightbox({
	images,
	index,
	onMove,
	onClose,
}: {
	images: string[];
	index: number;
	onMove: (index: number) => void;
	onClose: () => void;
}) {
	const { t } = useLang();
	const boxRef = useRef<HTMLDivElement>(null);
	const touchStart = useRef<number | null>(null);
	const many = images.length > 1;

	const step = useCallback(
		(delta: number) => {
			onMove((index + delta + images.length) % images.length);
		},
		[index, images.length, onMove],
	);

	// Mở khung: khoá cuộn nền và đưa bàn phím vào trong, trả lại đúng chỗ cũ khi
	// đóng để người dùng bàn phím không bị ném về đầu trang.
	useEffect(() => {
		const opener = document.activeElement as HTMLElement | null;
		const scroll = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		boxRef.current?.focus();

		return () => {
			document.body.style.overflow = scroll;
			opener?.focus?.();
		};
	}, []);

	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
			else if (event.key === "ArrowRight") step(1);
			else if (event.key === "ArrowLeft") step(-1);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, step]);

	return (
		<div
			className="lightbox"
			role="dialog"
			aria-modal="true"
			aria-label={t.viewerTitle}
			tabIndex={-1}
			ref={boxRef}
			// Chạm ra ngoài ảnh là đóng, thói quen của mọi trình xem ảnh. Bấm lên
			// chính tấm ảnh thì không, vì người ta đang xem nó.
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
			onTouchStart={(event) => {
				touchStart.current = event.touches[0]?.clientX ?? null;
			}}
			onTouchEnd={(event) => {
				const from = touchStart.current;
				touchStart.current = null;
				if (from === null || !many) return;
				const moved = (event.changedTouches[0]?.clientX ?? from) - from;
				// Quẹt ngang trên điện thoại: gần như toàn bộ người xem đến từ TikTok,
				// nơi quẹt là cách lật ảnh mặc định trong đầu họ.
				if (Math.abs(moved) > 45) step(moved < 0 ? 1 : -1);
			}}
		>
			<button
				type="button"
				className="lightbox-close"
				onClick={onClose}
				aria-label={t.viewerClose}
			>
				×
			</button>

			<img className="lightbox-img" src={images[index]} alt="" />

			{many && (
				<>
					<button
						type="button"
						className="lightbox-nav prev"
						onClick={() => step(-1)}
						aria-label={t.viewerPrev}
					>
						‹
					</button>
					<button
						type="button"
						className="lightbox-nav next"
						onClick={() => step(1)}
						aria-label={t.viewerNext}
					>
						›
					</button>
					<span className="lightbox-count">
						{index + 1} / {images.length}
					</span>
				</>
			)}
		</div>
	);
}
