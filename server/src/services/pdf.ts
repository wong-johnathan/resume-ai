import puppeteer, { Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

// A4 at 96dpi = 794 × 1123px
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

const PAGE_CSS = `
  <style>
    @page { size: A4; margin: 0; margin-top: 18mm; margin-bottom: 18mm; }
    @page :first { margin-top: 0; }
    html { width: 210mm; }
    body { width: 210mm; max-width: 210mm; overflow-x: hidden; }
    /* Prevent section titles from being orphaned at page bottom */
    .section-title { break-after: avoid; page-break-after: avoid; }
    /* Keep named entry containers intact across pages */
    .card, .tl-item, .edu-row { break-inside: avoid; page-break-inside: avoid; }
    /* Keep inline-style entry containers intact (used by most templates) */
    div:has(> .exp-header),
    div:has(> .exp-desc),
    div:has(> .exp-company) {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
`;

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Set viewport to exactly A4 width so layout matches the printed page
    await page.setViewport({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, deviceScaleFactor: 1 });

    // Inject @page rule and width constraints before </head>
    const injected = html.includes('</head>')
      ? html.replace('</head>', `${PAGE_CSS}</head>`)
      : PAGE_CSS + html;

    await page.setContent(injected, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
