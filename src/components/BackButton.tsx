import { useNavigate } from "react-router-dom";
export default function BackButton({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="p-2 rounded-full hover:bg-gray-200 focus:outline-none"
      aria-label="Назад"
    >
      <svg
        width={24}
        height={24}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}
