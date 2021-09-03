const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const AdmZip = require('adm-zip');

// Start up an express app to create routes for API endpoints
const cors = require('cors');
const express = require('express');
const app = express();
const port = 8080;

app.use(cors());

// Generate Color Files Data
const generateColorFilesData = async (file) => {
  const filePath = path.join(__dirname, `assets/svg/${file}.svg`);
  const colorFileDir = path.join(__dirname, `assets/colors/${file}`);

  if (!fs.existsSync(colorFileDir)) {
    fs.mkdirSync(colorFileDir);
  }

  // Create colored png files
  const colors = {
    yellow: 'rgb(223, 156, 49)', 
    red: 'rgb(239, 68, 68)', 
    blue: 'rgb(99, 102, 241)', 
    green: 'rgb(16, 185, 129)'
  };

  // Create png file instance
  const svgFile = fs.readFileSync(filePath);

  return Object.keys(colors).map(color => {
    // Create the colored png file
    sharp(svgFile)
      .tint(colors[color])
      .toFile(`assets/colors/${file}/${file}-${color}.png`)
      .catch((err) => {
        console.error(err);
      });
  });
}

const generateZip = async (file) => {
  const zip = new AdmZip();
  const colorFileDir = path.join(__dirname, `assets/colors/${file}`);
  const zipFileDir = path.join(__dirname, `assets/zip`);

  if (!fs.existsSync(zipFileDir)) {
    fs.mkdirSync(zipFileDir);
  }

  // Add the color files to the zip
  const colorFiles = fs.readdirSync(colorFileDir);
  colorFiles.forEach(colorFile => {
    zip.addLocalFile(`assets/colors/${file}/${colorFile}`);
  });
  zip.writeZip(`${zipFileDir}/${file}.zip`);
}

// Get Files function
const getFiles = async (dir) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      // If there is an error, reject the promise
      if (err) reject(err);

      // Otherwise, resolve the promise with the list of files
      // Map the list of files to include the desired information
      // name, 
      const fileData = files.map(file => {
        const slug = file.split('.')[0];

        // Generate all the color files data
        generateColorFilesData(slug);

        // Generate the zip file
        generateZip(slug);

        // Format the file name
        const fileName = file.split('.')[0].split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');

        // Get the file size in kb
        const stats = fs.statSync(path.join(dir, file));
        const fileSizeInKb = stats.size / 1000;

        // Return the file data object
        return {
          name: fileName,
          slug: slug,
          file: file,
          path: path.join(dir, file),
          uri: `http://localhost:${port}/assets/png/${file}`,
          size: fileSizeInKb
        }
      });

      // Return the list of files
      resolve(fileData);
    });
  });
}

// Get a single file
const getFile = async (file) => {
  const filePath = path.join(__dirname, `assets/png/${file}.png`);
  const svgFilePath = path.join(__dirname, `assets/svg/${file}.svg`);

  // Get the file size in kb
  const stats = fs.statSync(filePath);
  const fileSizeInKb = stats.size / 1000;

  // Check if color directory exists for file
  const colorFileDir = path.join(__dirname, `assets/colors/${file}`);
  let colorFilesData = [];

  // Generate color files data for given file
  await generateColorFilesData(file);

  await generateZip(file);
  
  return new Promise((resolve, reject) => {

    // Add the color files data to the colorFilesData array
    const colorFiles = fs.readdirSync(colorFileDir);
    
    colorFiles.forEach(colorFile => {
      // Return the file data object
      colorFilesData.push({
        name: colorFile.split('.')[0],
        slug: colorFile.split('.')[0],
        file: colorFile,
        uri: `http://localhost:${port}/assets/colors/${file}/${colorFile}`,
      });
    });

    // Create a file data object
    const fileData = {
      name: file.split('.')[0].split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' '),
      slug: file,
      uri: `http://localhost:${port}/assets/png/${file}.png`,
      size: fileSizeInKb,
      svg: fs.readFileSync(svgFilePath, 'utf8'),
      colors: colorFilesData,
      downloadUri: `http://localhost:${port}/assets/zip/${file}.zip`,
    }
    // Resolve the promise with the file data
    resolve(fileData);
  });
}

// Create an index route to query and return all data
app.get('/', (req, res) => {
  const pngPath = path.join(__dirname, 'assets/png');

  // Get the list of files
  getFiles(pngPath).then((files) => {
    res.send(files);
  });

});

// Create an endpoint for a specific object
app.get('/:slug', (req, res) => {
  const slug = req.params.slug;

  // Get file info
  getFile(slug).then((file) => {
    res.send(file);
  }).catch((err) => {
    res.send(err);
  })
});

// Expose static assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Create a listener to start the server
app.listen(port, () => {
  console.log(`CORS-enabled web server listening on port ${port}`);
});