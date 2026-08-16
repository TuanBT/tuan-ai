import { useEffect, useRef, useState } from "react";
import { useLang } from "../lib/lang-context";

/**
 * Ô mã bấm được để chép.
 *
 * Mã là chìa khoá duy nhất quay lại bài gửi, mà gõ tay tám chữ số trên điện
 * thoại thì rất dễ sai, nên cả ô là một nút chép, không bắt ai phải bôi đen.
 */
export function CopyCode({
	code,
	compact = false,
}: {
	code: string;
	compact?: boolean;
}) {
	const { t } = useLang();
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
		} catch {
			// Trình duyệt cũ hoặc không phải HTTPS thì chặn. Mã vẫn hiện rõ ràng
			// ngay đó để chép tay, nên không cần báo lỗi làm người dùng hoảng.
			return;
		}
		setCopied(true);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setCopied(false), 1800);
	}

	return (
		<button
			type="button"
			className={compact ? "code-box compact" : "code-box"}
			onClick={copy}
		>
			<span className="code-box-value">{code}</span>
			<span className="code-box-action">{copied ? t.copied : t.copyCode}</span>
		</button>
	);
}
