const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const fs = require('fs/promises');
const path = require('path');

const GENERATION_TIMEOUT_MS = 5000;
const FALLBACK_PDF_PATH = path.join(process.cwd(), 'cv.pdf');

module.exports = async (req, res) => {
  let browser;
  try {
    const host = req.headers.host;
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : 'https';
    const targetPath = typeof req.query.path === 'string' && req.query.path.startsWith('/') ? req.query.path : '/';
    const url = `${proto}://${host}${targetPath}${targetPath.includes('?') ? '&' : '?'}pdf=1`;

    chromium.setGraphicsMode = false;
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1440, height: 2200 },
      executablePath: await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();
    const pdf = await Promise.race([
      (async () => {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: GENERATION_TIMEOUT_MS });
        await page.waitForSelector('main', { timeout: Math.min(2500, GENERATION_TIMEOUT_MS - 500) }).catch(() => null);
        await page.evaluate(async () => {
          if (document.fonts && document.fonts.ready) {
            try {
              await document.fonts.ready;
            } catch (_) {}
          }
        });
        await new Promise((resolve) => setTimeout(resolve, 250));
        await page.emulateMediaType('screen');

        return page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '12mm', left: '10mm' }
        });
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`PDF generation timeout after ${GENERATION_TIMEOUT_MS}ms`)), GENERATION_TIMEOUT_MS)
      )
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="david-barreiro-cv.pdf"');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(pdf);
  } catch (error) {
    try {
      const fallbackPdf = await fs.readFile(FALLBACK_PDF_PATH);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="david-barreiro-cv.pdf"');
      res.setHeader('X-PDF-Fallback', 'static-cv.pdf');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(fallbackPdf);
    } catch (_) {
      res.status(500).json({ error: 'PDF generation failed', details: String(error?.message || error) });
    }
  } finally {
    if (browser) await browser.close();
  }
};
