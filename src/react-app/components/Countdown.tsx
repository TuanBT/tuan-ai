import { useEffect, useState } from "react";

function format(totalSeconds: number): string {
	const s = Math.max(0, totalSeconds);
	const hours = Math.floor(s / 3600);
	const minutes = Math.floor((s % 3600) / 60);
	const seconds = s % 60;
	return [hours, minutes, seconds]
		.map((part) => String(part).padStart(2, "0"))
		.join(":");
}

export function Countdown({ seconds }: { seconds: number }) {
	// Đếm số giây đã trôi qua thay vì trừ dần. Mốc thời gian lấy bên trong
	// effect và so lại với đồng hồ thật ở mỗi nhịp, nên đồng hồ vẫn đúng sau khi
	// điện thoại ngủ dậy và nhiều nhịp bị bỏ lỡ.
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const startedAt = Date.now();
		const timer = setInterval(() => {
			setElapsed(Math.round((Date.now() - startedAt) / 1000));
		}, 1000);
		return () => clearInterval(timer);
	}, [seconds]);

	const left = Math.max(0, seconds - elapsed);

	useEffect(() => {
		// Hết giờ thì tải lại để nhận hạn mức của ngày mới.
		if (elapsed > 0 && left === 0) window.location.reload();
	}, [elapsed, left]);

	return (
		<span className="clock" aria-live="off">
			{format(left)}
		</span>
	);
}
