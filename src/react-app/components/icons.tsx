import type { ReactNode } from "react";

/**
 * Bộ biểu tượng của trang.
 *
 * Trước đây mỗi chỗ tự lo lấy một cách: `☾` và `☀` là ký tự chữ nên mỗi hệ điều
 * hành vẽ một kiểu — máy này ra hình phẳng, máy kia ra emoji vàng chóe, máy nữa
 * ra ô vuông rỗng; `×` và `‹` là dấu toán học và dấu nháy kép tiếng Pháp bị đem
 * đi làm nút, nên chẳng bao giờ nằm đúng giữa nút (mới có mấy dòng CSS đẩy lệch
 * vài pixel cho cân); còn hai dấu hiệu kênh thì vẽ tay theo trí nhớ, nhìn gần
 * là thấy sai so với logo thật.
 *
 * Chép thẳng vào đây thay vì cài `lucide-react`: cả trang chỉ dùng có bảy hình,
 * mà thêm một gói phụ thuộc là thêm một thứ phải nâng cấp, phải tin tưởng, và
 * phải tải về. Cách này thì thứ gửi tới trình duyệt đúng bằng số hình đang dùng.
 *
 * Nguồn, chép nguyên đường vẽ chứ không tự nắn lại:
 * - Lucide (giấy phép ISC) cho biểu tượng giao diện — lucide.dev
 * - Simple Icons (CC0) cho hai dấu hiệu kênh — simpleicons.org
 *
 * Cần thêm hình mới: mở đúng hai trang trên, chép phần bên trong thẻ `svg` vào
 * đây, đừng vẽ tay.
 */

interface IconProps {
	/** Cỡ ô vuông chứa hình, tính bằng pixel. Mặc định vừa với chữ trong nút. */
	size?: number;
	className?: string;
}

/**
 * Khung chung cho nhóm hình nét của Lucide.
 *
 * `currentColor` để hình ăn theo màu chữ của nút bọc ngoài, nhờ vậy hiệu ứng khi
 * rê chuột và bảng màu nền tối không phải khai báo lại lần nào.
 *
 * `aria-hidden`: tất cả những nút dùng hình ở đây đều đã có `aria-label` hoặc
 * chữ đi kèm. Đọc thêm tên hình nữa là trình đọc màn hình nói hai lần.
 */
function Stroke({
	size = 18,
	className,
	children,
}: IconProps & { children: ReactNode }) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

/** Khung chung cho dấu hiệu thương hiệu: hình đặc, không có nét viền. */
function Solid({
	size = 17,
	className,
	children,
}: IconProps & { children: ReactNode }) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

export function SunIcon(props: IconProps) {
	return (
		<Stroke {...props}>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" />
			<path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" />
			<path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" />
			<path d="M20 12h2" />
			<path d="m6.34 17.66-1.41 1.41" />
			<path d="m19.07 4.93-1.41 1.41" />
		</Stroke>
	);
}

export function MoonIcon(props: IconProps) {
	return (
		<Stroke {...props}>
			<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
		</Stroke>
	);
}

export function CloseIcon(props: IconProps) {
	return (
		<Stroke {...props}>
			<path d="M18 6 6 18" />
			<path d="m6 6 12 12" />
		</Stroke>
	);
}

export function CheckIcon(props: IconProps) {
	return (
		<Stroke {...props}>
			<path d="M20 6 9 17l-5-5" />
		</Stroke>
	);
}

export function ArrowLeftIcon(props: IconProps) {
	return (
		<Stroke {...props}>
			<path d="m12 19-7-7 7-7" />
			<path d="M19 12H5" />
		</Stroke>
	);
}

export function ChevronLeftIcon(props: IconProps) {
	return (
		<Stroke {...props}>
			<path d="m15 18-6-6 6-6" />
		</Stroke>
	);
}

export function ChevronRightIcon(props: IconProps) {
	return (
		<Stroke {...props}>
			<path d="m9 18 6-6-6-6" />
		</Stroke>
	);
}

/* Hai dấu hiệu nhận biết kênh, dùng ở chân trang và ở nút xem tác phẩm bên trang
   tra cứu: người ta nhận ra biểu tượng nhanh hơn đọc chữ. */

export function TikTokMark(props: IconProps) {
	return (
		<Solid {...props}>
			<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
		</Solid>
	);
}

export function YouTubeMark(props: IconProps) {
	return (
		<Solid {...props}>
			<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
		</Solid>
	);
}
