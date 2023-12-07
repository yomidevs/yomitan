/* [object Object]*/
const fs = require('fs');
const path = require('path');

function convertToNewFormat(sourceJson) {
    // Parse the source JSON
    const data = JSON.parse(sourceJson);

    let count = 1; // Initialize a counter starting from 1

    const convertedData = data.map((item) => {
        const definitionWithNewLines = item.definition.replace(/<br>/g, '\n');

        const convertedItem = [
            item.term, // "term" line
            '', // Empty string for "pronunciation" line
            '', // Empty string for "altterm" line
            '', // Empty string for "pos" line
            0, // Default value for the 5th element
            [definitionWithNewLines], // Array with "definition" line as an element
            count, // Assign the current count to the 7th element
            '' // Empty string for "audio" line
        ];

        count++; // Increment count for the next iteration
        return convertedItem;
    });

    return convertedData;
}

function splitIntoChunks(data) {
    const chunkSize = 10000;
    const chunkedData = [];

    for (let i = 0; i < data.length; i += chunkSize) {
        chunkedData.push(data.slice(i, i + chunkSize));
    }

    return chunkedData;
}

function generateIndexJson(fileName) {
    // Remove '_Dictionary' (case insensitive) from the fileName and replace '_' with spaces
    const title = fileName.replace(/_dictionary/gi, '').replace(/_/g, ' ');

    // Get the revision by getting the current date and time
    const revision = new Date().toLocaleString();

    // Create the index JSON object
    const indexJson = {
        title,
        revision,
        sequenced: true,
        format: 3,
        author: '',
        url: '',
        description: ''
    };

    // Stringify the index JSON object
    return JSON.stringify(indexJson, null, 2);
}

// Provide the parent folder path
const parentFolder = './'; // Replace './' with your desired parent folder

// Get all the files in the parent folder and its subfolders
const files = getAllFiles(parentFolder);

// Filter the files by JSON extension
const jsonFiles = files.filter((file) => path.extname(file) === '.json');

// Loop through the JSON files and convert them to the new format
jsonFiles.forEach((file) => {
    // Read the source JSON file
    fs.readFile(file, 'utf8', (err, sourceJson) => {
        if (err) {
            console.error(`Error reading the file ${file}:`, err);
            return;
        }

        // Convert the source JSON to the new format
        const converted = convertToNewFormat(sourceJson);

        // Split the converted data into chunks
        const chunks = splitIntoChunks(converted);

        // Write each chunk to a separate JSON file
        chunks.forEach((chunk, index) => {
            // Remove the extra array wrapper from the chunk
            const convertedJson = JSON.stringify(chunk, null, 2);

            // Get the output file path by using 'term_bank' as the file name and the chunk number as the suffix
            const outputFile = path.join(path.dirname(file), `term_bank_${index + 1}.json`);

            fs.writeFile(outputFile, convertedJson, 'utf8', (err) => {
                if (err) {
                    console.error(`Error writing the file ${outputFile}:`, err);
                    return;
                }
                console.log(`File ${outputFile} written successfully.`);
            });
        });

        // Generate the index JSON file
        const indexJson = generateIndexJson(path.basename(file, '.json'));

        // Get the output file path by adding '_index' suffix
        const indexFile = path.join(path.dirname(file), 'index.json');

        // Write the index JSON file
        fs.writeFile(indexFile, indexJson, 'utf8', (err) => {
            if (err) {
                console.error(`Error writing the file ${indexFile}:`, err);
                return;
            }
            console.log(`File ${indexFile} written successfully.`);
        });
    });
});

// Helper function to get all files in a folder and its subfolders recursively
function getAllFiles(folder) {
    let files = [];

    // Read the folder contents
    const folderContents = fs.readdirSync(folder, {withFileTypes: true});

    // Loop through the folder contents
    folderContents.forEach((item) => {
    // Get the item path
        const itemPath = path.join(folder, item.name);

        // Check if the item is a file or a directory
        if (item.isFile()) {
            // Add the file path to the files array
            files.push(itemPath);
        } else if (item.isDirectory()) {
            // Recursively get the files in the subfolder
            const subFiles = getAllFiles(itemPath);

            // Add the subfiles to the files array
            files = files.concat(subFiles);
        }
    });

    // Return the files array
    return files;
}
