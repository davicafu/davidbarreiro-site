const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
  let browser;
  try {
    const host = req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const targetPath = typeof req.query.path === 'string' && req.query.path.startsWith('/') ? req.query.path : '/';
    const url = `${proto}://${host}${targetPath}${targetPath.includes('?') ? '&' : '?'}pdf=1`;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1440, height: 2200 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
    await page.waitForTimeout(800);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '12mm', left: '10mm' }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="david-barreiro-cv.pdf"');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(pdf);
  } catch (error) {
    res.status(500).json({ error: 'PDF generation failed', details: String(error?.message || error) });
  } finally {
    if (browser) await browser.close();
  }
};