import { FC } from "react";

interface LoadingBarProps {
  loading: boolean;
  color?: string;
  height?: string;
  zIndex?: number;
}

export const LoadingBar: FC<LoadingBarProps> = ({
  loading,
  color = "#FFFFFF",
  height = "3px",
  zIndex = 50,
}) => {
  if (!loading) return null;

  return (
    <div
      className="fixed top-0 left-0 w-full"
      style={{
        height,
        backgroundColor: "transparent",
        zIndex,
        overflow: "hidden",
      }}
    >
      <div
        className="h-full absolute"
        style={{
          width: "40%",
          backgroundColor: color,
          animation: "loading-slide 2s linear infinite",
          transform: "translateX(-100%)",
        }}
      />
    </div>
  );
};
