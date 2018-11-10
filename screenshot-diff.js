const puppeteer = require('puppeteer');
const fs = require('fs');
const PixelDiff = require('pixel-diff');
const PNG = require('pngjs').PNG;
const resizeImg = require('resize-img');

const DEFAULT_VIEWPORT = {
  width: 1000,
  height: 2000,
  deviceScaleFactor: 1,
};

const PNG_DIFF_FILENAME = 'page_diff.png';

const WAIT_FOR = 2000; // Additional seconds to wait after page is considered load.

const argv = require('yargs')
.options({
  'save': {
    alias: 's',
    describe: 'Save screenshots to disk',
    default: false,
  },
  'path': {
    alias: 'p',
    describe: 'Request path to load',
    demandOption: true,
    type: 'string',
  },
  'output': {
    alias: 'o',
    describe: 'Output HTML file',
    type: 'string',
  },
  'dir': {
    alias: 'd',
    describe: 'Output directory path',
    default: 'tmp',
    type: 'string',
  },
  'diff': {
    describe: 'Filename for diff screenshot between pages.',
    default: PNG_DIFF_FILENAME,
  },
  'device': {
    describe: 'Filename for diff screenshot between pages.',
    default: 'pc',
  },
})
.help()
.argv;

(async() => {

const browser = await puppeteer.launch({
  defaultViewport: DEFAULT_VIEWPORT,
});

async function screenshotPage(url) {
  console.log(url);
  const context = await browser.createIncognitoBrowserContext();

  const page = await context.newPage();
  await page.goto(url, {waitUntil: 'networkidle2'});

  await page.evaluate(() => {
    let lastScrollTop = document.scrollingElement.scrollTop;
    const scroll = () => {
      document.scrollingElement.scrollTop += 100;//(viewPortHeight / 2);
      if (document.scrollingElement.scrollTop !== lastScrollTop) {
        lastScrollTop = document.scrollingElement.scrollTop;
        requestAnimationFrame(scroll);
      }
    };
    scroll();
  });

  await page.waitFor(WAIT_FOR);

  const buffer = await page.screenshot({
    path: argv.save ? argv.scroll : null,
    fullPage: true
  });

  await context.close();
  return {screenshot: buffer};
}

async function resizeImage(pngBuffer, scale = 0.5) {
  const png = PNG.sync.read(pngBuffer);
  pngBuffer = await resizeImg(pngBuffer, {
    width: Math.round(png.width * scale),
    height: Math.round(png.height * scale),
  });
  return {buffer: pngBuffer, png: PNG.sync.read(pngBuffer)};
}

let {screenshot: screenshotB} = await screenshotPage(`${process.env['BASE_URI']}` + argv.path);
let {screenshot: screenshotA} = await screenshotPage(`${process.env['COMPARE_URI']}` + argv.path);

let pngA = PNG.sync.read(screenshotA);
let pngB = PNG.sync.read(screenshotB);

const diff = new PixelDiff({
  imageA: screenshotA,
  imageB: screenshotB,
  thresholdType: PixelDiff.THRESHOLD_PERCENT, // thresholdType: PixelDiff.RESULT_DIFFERENT,
  threshold: 0.01, // 1% threshold
  imageOutputPath: argv.dir + '/' + argv.diff,
  cropImageB: {
    x: 0,
    y: 0,
    width: pngA.width,
    height: pngA.height,
  },
});

const result = await diff.runWithPromise();

console.log(`Found ${result.differences} pixels differences.`);

({png: pngA, buffer: screenshotA} = await resizeImage(screenshotA, 0.25));
({png: pngB, buffer: screenshotB} = await resizeImage(screenshotB, 0.25));

const {png: pngDiff, buffer: diffBuffer} = await resizeImage(fs.readFileSync(argv.dir + '/' + argv.diff), 0.25);

const page = await browser.newPage();
await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Google+Sans:400,500,600">
        <style>
          * {
            box-sizing: border-box;
          }
          section {
            display: flex;
          }
          body > section > div {
            flex: 1;
            text-align: center;
          }
          h1 {
            color: #0D47A1;
          }
          h1, h2 {
            text-align: center;
            font-weight: inherit;
          }
          img {
            max-width: 100%;
            border: 1px solid #333;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Compare [${process.env['BASE_URI']}] with [${process.env['COMPARE_URI']}]</h1>
        </header>
        <section>
          <div>
            <h2><a href="${process.env['BASE_URI']}">${process.env['BASE_URI']}</a></h2>
            <img src="data:img/png;base64,${screenshotA.toString('base64')}" class="screenshot">
          </div>
          <div>
            <h2>&nbsp;</h2>
            <p class="summary">(diff)</p>
            <img src="data:img/png;base64,${diffBuffer.toString('base64')}" class="screenshot">
          </div>
          <div>
            <h2><a href="${process.env['COMPARE_URI']}">${process.env['COMPARE_URI']}</a></h2>
            <img src="data:img/png;base64,${screenshotB.toString('base64')}" class="screenshot">
          </div>
        </section>
      </body>
    </html>
  `);

const output = argv.output ? argv.output : argv.path.replace(/\//g, '_') + ((argv.device == 'sp') ? '_sp' : '_pc') + '.html'
fs.writeFileSync(argv.dir + '/' + output, await page.content(), {encoding: 'utf8'});

await page.close();
await browser.close();

})();
