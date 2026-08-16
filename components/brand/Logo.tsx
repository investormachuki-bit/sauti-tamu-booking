interface LogoProps {
  compact?: boolean;
}

export default function Logo({
  compact = false,
}: LogoProps) {
  return (
    <div className="st-logo">
      <div className="st-logo-mark">
        ST
      </div>

      {!compact && (
        <div>
          <div className="st-logo-name">
            Sauti Tamu
          </div>

          <div className="st-logo-subtitle">
            Piano Center
          </div>
        </div>
      )}
    </div>
  );
}