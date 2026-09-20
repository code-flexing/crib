export function VerifiedHomeIllustration() {
  return (
    <svg
      className="h-auto w-full max-w-[34rem]"
      viewBox="0 0 560 500"
      fill="none"
      role="img"
      aria-labelledby="verified-home-title verified-home-description"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="verified-home-title">A verified student home</title>
      <desc id="verified-home-description">
        An illustrated home with a location pin and verification badge, representing trusted
        student accommodation.
      </desc>

      <path
        d="M72 408C111 371 169 354 239 354C332 354 423 374 489 424"
        stroke="#D8E9E2"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M80 429C161 402 263 399 472 438"
        stroke="#F0E5D4"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <g className="verified-home-illustration__house">
        <path d="M133 245L282 120L431 245V411H133V245Z" fill="#F5FAF7" />
        <path d="M112 247L282 104L452 247" stroke="#0B0C0E" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M133 245V411H431V245" stroke="#0B0C0E" strokeWidth="7" strokeLinejoin="round" />
        <path d="M282 105V71" stroke="#0B0C0E" strokeWidth="7" strokeLinecap="round" />
        <path d="M282 71L311 86" stroke="#0C7355" strokeWidth="7" strokeLinecap="round" />

        <path d="M177 266H247V328H177V266Z" fill="#D8E9E2" stroke="#0B0C0E" strokeWidth="5" />
        <path d="M212 266V328M177 297H247" stroke="#0B0C0E" strokeWidth="4" />
        <path d="M318 266H388V328H318V266Z" fill="#D8E9E2" stroke="#0B0C0E" strokeWidth="5" />
        <path d="M353 266V328M318 297H388" stroke="#0B0C0E" strokeWidth="4" />

        <path d="M250 411V337C250 326 259 317 270 317H294C305 317 314 326 314 337V411" fill="#F0E5D4" stroke="#0B0C0E" strokeWidth="5" />
        <circle cx="294" cy="366" r="4" fill="#0C7355" />
      </g>

      <g className="verified-home-illustration__pin">
        <path d="M438 153C438 123 462 99 492 99C522 99 546 123 546 153C546 195 492 239 492 239C492 239 438 195 438 153Z" fill="#0C7355" />
        <circle cx="492" cy="151" r="22" fill="#FFFFFF" />
        <path d="M480 151L489 160L506 141" stroke="#0C7355" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g className="verified-home-illustration__card">
        <rect x="57" y="93" width="128" height="92" rx="8" fill="#FFFFFF" stroke="#0B0C0E" strokeWidth="4" />
        <circle cx="89" cy="124" r="15" fill="#F0E5D4" />
        <path d="M83 124L88 129L97 119" stroke="#0B0C0E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M115 116H160M115 132H151M79 156H160" stroke="#0C7355" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}