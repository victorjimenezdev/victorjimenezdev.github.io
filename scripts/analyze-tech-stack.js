import fs from 'fs';
import path from 'path';
import https from 'https';
import { workProjects, personalProjects } from '../src/data/projects.js';

const analyzeUrl = (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve({ error: 'No URL' });

        const req = https.get(url, { timeout: 10000 }, (res) => {
            let data = '';

            // Check Headers first
            const headers = JSON.stringify(res.headers).toLowerCase();
            const tech = [];

            if (headers.includes('drupal') || headers.includes('x-generator":"drupal')) tech.push('Drupal');
            if (headers.includes('wordpress') || headers.includes('x-generator":"wordpress')) tech.push('WordPress');
            if (headers.includes('varnish')) tech.push('Varnish');
            if (headers.includes('cloudflare')) tech.push('Cloudflare');
            if (headers.includes('acquia')) tech.push('Acquia Cloud');
            if (headers.includes('pantheon')) tech.push('Pantheon');

            res.on('data', (chunk) => {
                data += chunk;
                // Limit buffer to first 500KB to avoid memory issues
                if (data.length > 500000) {
                    req.destroy();
                }
            });

            res.on('end', () => {
                const lowerData = data.toLowerCase();

                // HTML Signatures
                if (lowerData.includes('drupal.settings') || lowerData.includes('/sites/default/files')) {
                    if (!tech.includes('Drupal')) tech.push('Drupal');
                }
                if (lowerData.includes('/wp-content/') || lowerData.includes('wp-json')) {
                    if (!tech.includes('WordPress')) tech.push('WordPress');
                }
                if (lowerData.includes('__next_data__')) tech.push('Next.js');
                if (lowerData.includes('data-reactroot') || lowerData.includes('react-dom')) tech.push('React');
                if (lowerData.includes('gatsby')) tech.push('Gatsby');
                if (lowerData.includes('graphql') || lowerData.includes('apollo')) tech.push('GraphQL');
                if (lowerData.includes('jquery')) tech.push('jQuery');
                if (lowerData.includes('bootstrap')) tech.push('Bootstrap');

                resolve({
                    url,
                    tech: [...new Set(tech)], // Unique
                    status: res.statusCode
                });
            });

            res.on('error', (err) => resolve({ error: err.message }));

        }).on('error', (err) => {
            resolve({ error: err.message });
        });
    });
};

const run = async () => {
    console.log('Starting Deep Tech Analysis...');
    const allProjects = [...workProjects, ...personalProjects];

    const results = [];

    for (const p of allProjects) {
        process.stdout.write(`Analyzing ${p.title}... `);
        try {
            const analysis = await analyzeUrl(p.link);
            console.log(analysis.tech?.join(', ') || analysis.error);
            results.push({
                id: p.id,
                title: p.title,
                currentTags: p.tags,
                detected: analysis.tech || []
            });
        } catch (e) {
            console.log('Error');
        }
    }

    console.log('\n--- SUMMARY REPORT ---');
    console.log(JSON.stringify(results, null, 2));
};

run();
