export default function Home() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <svg
        className="red-box"
        role="img"
        aria-label="Mailbox"
        style={{
          transform: `translate(calc(-50% + -100px), -130px)`,
          // keep same default size as the original red box
          ['--mailbox-width' as any]: '100px',
          ['--mailbox-height' as any]: '175px',
        }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 175"
        preserveAspectRatio="xMidYMid meet"
      >
        <image href="/mailbox.svg" width="100%" height="100%" />
      </svg>
      {/*
        To change the duck size, edit the inline CSS variables below or set
        `--duck-width` / `--duck-height` in a stylesheet. Values accept any CSS size (px, %, rem).
      */}
      <svg
        className="second-box"
        role="img"
        aria-label="Duck"
        style={{
          transform: `translate(calc(-50% + 50px), -50px)`,
          // change these values inline if you want a different default for this instance
          ['--duck-width' as any]: '200px',
          ['--duck-height' as any]: '300px',
        }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 175"
        preserveAspectRatio="xMidYMid meet"
      >
        <image href="/duck.svg" width="100%" height="100%" />
      </svg>
    </div>
  );
}