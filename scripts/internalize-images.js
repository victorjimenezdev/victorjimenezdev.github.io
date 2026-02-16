import fs from 'fs';
import path from 'path';
import https from 'https';
import { workProjects, personalProjects } from '../src/data/projects.js';

const DOWNLOAD_DIR = path.resolve('public/images/projects');
const DATA_FILE = path.resolve('src/data/projects.js');

// Ensure directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                res.resume();
                // Consume response data to free up memory
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
};

const processProjects = async (projects, type) => {
    const updatedProjects = [];

    for (const project of projects) {
        if (project.image && project.image.includes('thum.io')) {
            const filename = `${project.id}.jpg`; // Assuming JPG from thum.io
            const filepath = path.join(DOWNLOAD_DIR, filename);
            const publicPath = `/images/projects/${filename}`;

            console.log(`Downloading ${project.title}...`);
            try {
                await downloadImage(project.image, filepath);
                console.log(`✓ Saved to ${publicPath}`);
                updatedProjects.push({ ...project, image: publicPath });
            } catch (e) {
                console.error(`✗ Failed ${project.title}: ${e.message}`);
                updatedProjects.push(project);
            }
        } else {
            updatedProjects.push(project);
        }
    }
    return updatedProjects;
};

const run = async () => {
    console.log('Starting image internalizer...');

    const newWork = await processProjects(workProjects, 'work');
    const newPersonal = await processProjects(personalProjects, 'personal');

    const fileContent = `
export const workProjects = ${JSON.stringify(newWork, null, 2)};

export const personalProjects = ${JSON.stringify(newPersonal, null, 2)};
`;

    // Fix unquoted keys if desired (JSON.stringify quotes strictly)
    // But strictly quoted JSON in JS file is valid JS.
    // We might want to preserve the export format more cleanly if possible, 
    // but for data files standard JSON format is fine.

    fs.writeFileSync(DATA_FILE, fileContent);
    console.log('Updated projects.js');
};

run();
