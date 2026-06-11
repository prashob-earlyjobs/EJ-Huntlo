export function WorkflowVisualization() {
  return (
    <svg
      className="h-full max-h-[500px] w-full"
      fill="none"
      viewBox="0 0 1000 500"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern id="landing-grid" height="40" patternUnits="userSpaceOnUse" width="40">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="rgba(0,80,203,0.05)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect fill="url(#landing-grid)" height="500" width="1000" />
      <path
        className="landing-workflow-line opacity-20"
        d="M150 250 C 300 250, 400 150, 500 150"
        stroke="#0050CB"
        strokeWidth="2"
      />
      <path
        className="landing-workflow-line opacity-20"
        d="M150 250 C 300 250, 400 350, 500 350"
        stroke="#0050CB"
        strokeWidth="2"
      />
      <path
        className="landing-workflow-line opacity-20"
        d="M500 150 C 650 150, 750 250, 850 250"
        stroke="#0050CB"
        strokeWidth="2"
      />
      <path
        className="landing-workflow-line opacity-20"
        d="M500 350 C 650 350, 750 250, 850 250"
        stroke="#0050CB"
        strokeWidth="2"
      />
      <g className="landing-animate-float" style={{ animationDelay: "0s" }}>
        <circle cx="150" cy="250" fill="white" r="40" stroke="#0050CB" strokeWidth="1" />
        <text
          fill="#56657c"
          fontFamily="Inter, sans-serif"
          fontSize="12"
          textAnchor="middle"
          x="150"
          y="310"
        >
          Global Search
        </text>
        <path d="M140 240 L160 260 M160 240 L140 260" stroke="#0050CB" strokeWidth="2" />
      </g>
      <g className="landing-animate-float" style={{ animationDelay: "1s" }}>
        <circle className="landing-glow-node" cx="500" cy="250" fill="#0050CB" r="60" />
        <path
          d="M485 240 L515 240 M485 250 L515 250 M485 260 L515 260"
          stroke="white"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <text
          fill="#0050CB"
          fontFamily="Epilogue, sans-serif"
          fontSize="14"
          fontWeight="600"
          textAnchor="middle"
          x="500"
          y="330"
        >
          AI AGENT LAYER
        </text>
      </g>
      <circle className="animate-pulse" cx="500" cy="150" fill="#0050CB" r="10" />
      <circle className="animate-pulse" cx="500" cy="350" fill="#0050CB" r="10" />
      <g className="landing-animate-float" style={{ animationDelay: "2s" }}>
        <rect
          fill="white"
          height="60"
          rx="12"
          stroke="#0050CB"
          strokeWidth="1"
          width="80"
          x="810"
          y="220"
        />
        <text
          fill="#56657c"
          fontFamily="Inter, sans-serif"
          fontSize="12"
          textAnchor="middle"
          x="850"
          y="310"
        >
          Verified Leads
        </text>
      </g>
      <circle fill="#0050CB" r="4">
        <animateMotion
          dur="4s"
          path="M150 250 C 300 250, 400 150, 500 150"
          repeatCount="indefinite"
        />
      </circle>
      <circle fill="#0050CB" r="4">
        <animateMotion
          begin="1s"
          dur="5s"
          path="M150 250 C 300 250, 400 350, 500 350"
          repeatCount="indefinite"
        />
      </circle>
      <circle fill="#0050CB" r="4">
        <animateMotion
          begin="2s"
          dur="3s"
          path="M500 250 C 650 250, 750 250, 850 250"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
