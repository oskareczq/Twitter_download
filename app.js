// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}

// Main application logic
class XVideoDownloader {
    constructor() {
        this.form = document.getElementById('downloadForm');
        this.urlInput = document.getElementById('tweetUrl');
        this.qualitySelect = document.getElementById('quality');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.loader = document.getElementById('loader');
        this.result = document.getElementById('result');

        this.initEventListeners();
    }

    initEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.downloadVideo();
        });

        // Auto-paste from clipboard
        this.urlInput.addEventListener('focus', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text.includes('x.com') || text.includes('twitter.com')) {
                    this.urlInput.value = text;
                }
            } catch (err) {
                console.log('Clipboard access denied');
            }
        });
    }

    async downloadVideo() {
        const url = this.urlInput.value.trim();
        const quality = this.qualitySelect.value;

        if (!this.isValidTwitterUrl(url)) {
            this.showResult('Nieprawidłowy link do X/Twitter', 'error');
            return;
        }

        this.showLoader(true);
        this.downloadBtn.disabled = true;

        try {
            // Extract tweet ID from URL
            const tweetId = this.extractTweetId(url);

            // Use multiple API endpoints for reliability
            const videoData = await this.fetchVideoData(tweetId, quality);

            if (videoData && videoData.downloadUrl) {
                this.showResult(
                    `Film gotowy do pobrania!
                    <a href="${videoData.downloadUrl}" class="download-link" download="twitter_video.mp4">
                        📱 Pobierz na urządzenie
                    </a>`,
                    'success'
                );
            } else {
                throw new Error('Nie znaleziono filmu w tym tweecie');
            }

        } catch (error) {
            this.showResult(`Błąd: ${error.message}`, 'error');
        } finally {
            this.showLoader(false);
            this.downloadBtn.disabled = false;
        }
    }

    isValidTwitterUrl(url) {
        const twitterRegex = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/;
        return twitterRegex.test(url);
    }

    extractTweetId(url) {
        const match = url.match(/status\/(\d+)/);
        return match ? match[1] : null;
    }

    async fetchVideoData(tweetId, quality) {
        // Using multiple free APIs for better reliability
        const apis = [
            {
                name: 'API 1',
                url: `https://api.twitter-video.download/v1/status/${tweetId}`,
                transform: (data) => ({
                    downloadUrl: data.videos?.[quality] || data.videos?.high || data.videos?.[0]
                })
            },
            {
                name: 'API 2',
                url: `https://twitsave.com/info?url=https://x.com/i/status/${tweetId}`,
                transform: (data) => ({
                    downloadUrl: data.download?.[0]?.url
                })
            }
        ];

        for (const api of apis) {
            try {
                const response = await fetch(api.url);
                if (response.ok) {
                    const data = await response.json();
                    const result = api.transform(data);
                    if (result.downloadUrl) {
                        return result;
                    }
                }
            } catch (error) {
                console.log(`${api.name} failed:`, error);
            }
        }

        // Fallback: Use CORS proxy with direct Twitter API
        return await this.fallbackDownload(tweetId, quality);
    }

    async fallbackDownload(tweetId, quality) {
        // This would use a CORS proxy to access Twitter's API
        // Implementation depends on available proxy services
        const proxyUrl = `https://cors-anywhere.herokuapp.com/https://api.twitter.com/1.1/statuses/show.json?id=${tweetId}&include_entities=true`;

        try {
            const response = await fetch(proxyUrl);
            const data = await response.json();

            const media = data.extended_entities?.media?.[0];
            if (media?.type === 'video') {
                const variants = media.video_info.variants.filter(v => v.content_type === 'video/mp4');
                const qualityMap = {
                    high: variants[variants.length - 1],
                    medium: variants[Math.floor(variants.length / 2)],
                    low: variants[0]
                };

                return {
                    downloadUrl: qualityMap[quality]?.url || variants[0]?.url
                };
            }
        } catch (error) {
            throw new Error('Nie udało się pobrać filmu. Spróbuj ponownie później.');
        }

        return null;
    }

    showLoader(show) {
        this.loader.style.display = show ? 'block' : 'none';
    }

    showResult(message, type) {
        this.result.innerHTML = message;
        this.result.className = `result ${type}`;
        this.result.style.display = 'block';

        // Hide after 10 seconds for error messages
        if (type === 'error') {
            setTimeout(() => {
                this.result.style.display = 'none';
            }, 10000);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new XVideoDownloader();
});
