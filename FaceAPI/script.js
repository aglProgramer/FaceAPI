const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const infoDiv = document.getElementById('info');
const chartCanvas = document.getElementById('chart');
const WEIGHTS_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
let stream = null;

// Colores y emojis por emoción
const emotionStyles = {
    happy: { color: '#FFD700', emoji: '😄', filter: 'brightness(1.2) saturate(1.4)' },
    angry: { color: '#FF3B3B', emoji: '😡', filter: 'contrast(1.3) hue-rotate(-15deg)' },
    sad: { color: '#3B82F6', emoji: '😢', filter: 'grayscale(0.6)' },
    surprised: { color: '#A855F7', emoji: '😲', filter: 'brightness(1.1) contrast(1.2)' },
    disgusted: { color: '#22C55E', emoji: '🤢', filter: 'hue-rotate(80deg)' },
    fearful: { color: '#8B5CF6', emoji: '😨', filter: 'sepia(0.3)' },
    neutral: { color: '#AAAAAA', emoji: '😐', filter: 'none' }
};

// Inicializar gráfico
const emotionLabels = Object.keys(emotionStyles);
const emotionData = new Array(emotionLabels.length).fill(0);
const emotionChart = new Chart(chartCanvas, {
    type: 'bar',
    data: {
        labels: emotionLabels,
        datasets: [{
            label: 'Frecuencia de emociones detectadas',
            data: emotionData,
            backgroundColor: emotionLabels.map(e => emotionStyles[e].color),
            borderWidth: 1
        }]
    },
    options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
    }
});

async function main() {
    infoDiv.innerText = "🔄 Cargando modelos...";
    await faceapi.nets.tinyFaceDetector.loadFromUri(WEIGHTS_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(WEIGHTS_URL);
    infoDiv.innerText = "✅ Modelos cargados, iniciando cámara...";

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err) {
        infoDiv.innerHTML = `<b>No se pudo acceder a la cámara:</b> ${err.message}`;
        infoDiv.style.background = 'red';
        return;
    }

    video.srcObject = stream;

    await new Promise(resolve => {
        video.onloadedmetadata = resolve;
        video.play();
    });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    detect();
}

const detect = async () => {
    try {
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160 }))
            .withFaceExpressions();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const resized = faceapi.resizeResults(detections, {
            width: canvas.width,
            height: canvas.height
        });

        faceapi.draw.drawDetections(canvas, resized);

        if (resized.length === 0) {
            infoDiv.innerHTML = "👀 Esperando rostros...";
            video.style.filter = 'none';
        } else {
            infoDiv.innerHTML = `<b>👥 Rostros detectados: ${resized.length}</b><br>`;
        }

        resized.forEach((detection, i) => {
            const box = detection.detection.box;
            const expressions = detection.expressions;
            const [mainEmotion, confidence] = Object.entries(expressions).sort((a, b) => b[1] - a[1])[0];

            const style = emotionStyles[mainEmotion];
            ctx.font = '18px Poppins';
            ctx.fillStyle = style.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(`${style.emoji} ${mainEmotion} (${(confidence * 100).toFixed(0)}%)`, box.x, box.y - 10);
            ctx.fillText(`${style.emoji} ${mainEmotion} (${(confidence * 100).toFixed(0)}%)`, box.x, box.y - 10);

            // Panel de info dinámico
            infoDiv.innerHTML += `🧠 Persona ${i + 1}: <span style="color:${style.color}">${style.emoji} ${mainEmotion}</span> (${(confidence * 100).toFixed(0)}%)<br>`;
            infoDiv.style.background = style.color + '22';
            infoDiv.style.boxShadow = `0 0 20px ${style.color}55`;
            video.style.filter = style.filter;

            // Actualizar gráfico
            const idx = emotionLabels.indexOf(mainEmotion);
            if (idx !== -1) {
                emotionData[idx]++;
                emotionChart.update();
            }
        });

    } catch (err) {
        console.error('Error en detección:', err);
    }

    requestAnimationFrame(detect);
};

main();
