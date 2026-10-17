import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const appDir = path.resolve('src/app');
const publicDir = path.resolve('public');
const brandingDir = path.resolve('public/images/branding');
const civicDir = path.resolve('public/images/civic');

fs.mkdirSync(brandingDir, { recursive: true });
fs.mkdirSync(civicDir, { recursive: true });

async function processBranding() {
  console.log('--- Processing Branding Assets ---');
  // Source logo: public/images/branding/palpass-logo.png or src/app/icon.jfif
  const baseLogoPath = fs.existsSync(path.join(brandingDir, 'palpass-logo.png')) 
    ? path.join(brandingDir, 'palpass-logo.png')
    : path.join(appDir, 'icon.jfif');

  console.log('Using base logo:', baseLogoPath);

  // Generate standard branding icons
  await sharp(baseLogoPath)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(brandingDir, 'icon-512.png'));
  console.log('Created branding/icon-512.png');

  await sharp(baseLogoPath)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(brandingDir, 'icon-192.png'));
  console.log('Created branding/icon-192.png');

  await sharp(baseLogoPath)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(brandingDir, 'apple-touch-icon.png'));
  console.log('Created branding/apple-touch-icon.png');

  // Also update root /public for browser & PWA
  await sharp(baseLogoPath)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'icon-512.png'));

  await sharp(baseLogoPath)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'icon-192.png'));

  await sharp(baseLogoPath)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(baseLogoPath)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'apple-icon.png'));

  await sharp(baseLogoPath)
    .resize(48, 48, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'icon.png'));

  await sharp(baseLogoPath)
    .resize(32, 32, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'favicon-32.png'));

  // Update src/app/icon.png so Next.js App Router metadata serves the real brand logo!
  await sharp(baseLogoPath)
    .resize(48, 48, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(path.join(appDir, 'icon.png'));
  console.log('Updated src/app/icon.png for Next.js App Router');
}

async function processCivicPhotos() {
  console.log('--- Processing Civic Photographic Assets ---');

  // 1. Children playing with stones / hope & resilience
  const photoChildren = path.join(appDir, '63-9-1731396808.png');
  if (fs.existsSync(photoChildren)) {
    console.log('Processing children playing (63-9-1731396808.png)...');
    await sharp(photoChildren)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(civicDir, 'hero-people.webp'));

    await sharp(photoChildren)
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(path.join(civicDir, 'hero-people.jpg'));

    await sharp(photoChildren)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(civicDir, 'hero-palestinian-people.webp'));

    await sharp(photoChildren)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(civicDir, 'community-solidarity.webp'));
    console.log('Generated hero-people.webp & community-solidarity.webp');
  }

  // 2. Boy with cat / human warmth & compassion
  const photoCatBoy = path.join(appDir, '63-10-1731396834.png');
  if (fs.existsSync(photoCatBoy)) {
    console.log('Processing boy with cat (63-10-1731396834.png)...');
    await sharp(photoCatBoy)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(civicDir, 'civic-warmth.webp'));

    await sharp(photoCatBoy)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(civicDir, 'heritage-land.webp'));

    await sharp(photoCatBoy)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(civicDir, 'hero-palestine-warmth.webp'));
    console.log('Generated civic-warmth.webp & heritage-land.webp');
  }

  // 3. Tent school education
  const photoTentSchool = path.join(appDir, 'dsaq-4-1731400892.png');
  if (fs.existsSync(photoTentSchool)) {
    console.log('Processing tent school (dsaq-4-1731400892.png)...');
    await sharp(photoTentSchool)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(civicDir, 'education-future.webp'));

    await sharp(photoTentSchool)
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(path.join(civicDir, 'education-future.jpg'));
    console.log('Generated education-future.webp');
  }

  // 4. Girls learning/movement circle
  const photoGirlsCircle = path.join(appDir, '63-5-1731396956.png');
  if (fs.existsSync(photoGirlsCircle)) {
    console.log('Processing girls circle (63-5-1731396956.png)...');
    await sharp(photoGirlsCircle)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(civicDir, 'education-solidarity.webp'));

    await sharp(photoGirlsCircle)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(civicDir, 'civic-community.webp'));
    console.log('Generated education-solidarity.webp & civic-community.webp');
  }

  // 5. Palestinian Passport and Green ID
  const photoPassport = path.join(appDir, 'thumb.png');
  if (fs.existsSync(photoPassport)) {
    console.log('Processing Palestinian passport & ID (thumb.png)...');
    await sharp(photoPassport)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toFile(path.join(civicDir, 'family-civil.webp'));

    await sharp(photoPassport)
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toFile(path.join(civicDir, 'family-civil.jpg'));

    await sharp(photoPassport)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toFile(path.join(civicDir, 'smart-id-pass.webp'));
    console.log('Generated family-civil.webp & smart-id-pass.webp');
  }

  // 6. Ensure crossings-transit and olive-agriculture aliases exist
  const crossingSource = path.join(civicDir, 'crossing-terminal.webp');
  if (fs.existsSync(crossingSource)) {
    fs.copyFileSync(crossingSource, path.join(civicDir, 'crossings-transit.webp'));
    console.log('Created crossings-transit.webp alias');
  }

  const oliveSource = path.join(civicDir, 'olive-groves.webp');
  if (fs.existsSync(oliveSource)) {
    fs.copyFileSync(oliveSource, path.join(civicDir, 'olive-agriculture.webp'));
    console.log('Created olive-agriculture.webp alias');
  }
}

async function run() {
  await processBranding();
  await processCivicPhotos();
  console.log('Asset Migration & Normalization Completed Successfully!');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
