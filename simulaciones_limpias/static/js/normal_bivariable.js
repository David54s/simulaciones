// Variables para descarga
let resultadosSimulacion = null;
let parametrosSimulacion = null;

let scene, camera, renderer, controls;
let histogramBars = [];
let axisSystem = null;
let currentSamples = [];
let raycaster, mouse;
let hoverTooltip = null;
let maxFrequency = 0;
let totalSamples = 0;

function initThreeJS() {
    const container = document.getElementById('threejs-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(10, 12, 10);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    
    // Configurar raycaster para interacción
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Crear tooltip para hover
    hoverTooltip = document.createElement('div');
    hoverTooltip.style.position = 'absolute';
    hoverTooltip.style.padding = '8px';
    hoverTooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    hoverTooltip.style.color = 'white';
    hoverTooltip.style.borderRadius = '4px';
    hoverTooltip.style.pointerEvents = 'none';
    hoverTooltip.style.display = 'none';
    hoverTooltip.style.zIndex = '1000';
    hoverTooltip.style.fontSize = '12px';
    container.appendChild(hoverTooltip);
    
    // Event listeners para interacción
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onMouseClick);
    
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(0, 5, -10);
    scene.add(backLight);
    
    window.addEventListener('resize', onWindowResize);
    animate();
}

function onMouseMove(event) {
    const container = document.getElementById('threejs-container');
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
    
    // Actualizar el raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Buscar intersecciones con las barras del histograma
    const intersects = raycaster.intersectObjects(histogramBars);
    
    if (intersects.length > 0) {
        const object = intersects[0].object;
        const density = object.userData.density;
        const xValue = object.userData.xValue;
        const zValue = object.userData.zValue;
        
        // Mostrar tooltip
        hoverTooltip.style.display = 'block';
        hoverTooltip.style.left = (event.clientX - rect.left + 10) + 'px';
        hoverTooltip.style.top = (event.clientY - rect.top) + 'px';
        hoverTooltip.innerHTML = `
            <div>X: ${xValue.toFixed(2)}</div>
            <div>Y: ${zValue.toFixed(2)}</div>
            <div>Densidad: ${density.toFixed(4)}</div>
            <div>Porcentaje: ${(density / maxFrequency * 100).toFixed(1)}%</div>
        `;
        
        // Resaltar la barra
        object.material.emissive = new THREE.Color(0x333333);
        object.material.needsUpdate = true;
    } else {
        hoverTooltip.style.display = 'none';
        
        // Restaurar todas las barras
        histogramBars.forEach(bar => {
            if (bar.material && bar.material.emissive) {
                bar.material.emissive = new THREE.Color(0x000000);
                bar.material.needsUpdate = true;
            }
        });
    }
}

function onMouseClick(event) {
    // Si se hace clic en una barra, podríamos ampliar la información
    // Por ahora solo mantenemos el hover
}

function onWindowResize() {
    const container = document.getElementById('threejs-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function createAxisSystem(xMin, xMax, zMin, zMax, yMax) {
    if (axisSystem) {
        axisSystem.forEach(obj => scene.remove(obj));
    }
    axisSystem = [];
    
    // Calcular el tamaño de la rejilla
    const sizeX = xMax - xMin;
    const sizeZ = zMax - zMin;
    const gridSize = Math.max(sizeX, sizeZ);
    
    // Crear rejilla (plano X-Z) con colores suaves
    const gridHelper = new THREE.GridHelper(gridSize, 10, 0xcccccc, 0xdddddd);
    gridHelper.position.set((xMin + xMax) / 2, 0, (zMin + zMax) / 2);
    scene.add(gridHelper);
    axisSystem.push(gridHelper);
    
    // Ejes en gris suave
    const axesMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, linewidth: 2 });
    
    // Eje X
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xMin, 0, zMin),
        new THREE.Vector3(xMax, 0, zMin)
    ]);
    const xAxis = new THREE.Line(xAxisGeometry, axesMaterial);
    scene.add(xAxis);
    axisSystem.push(xAxis);
    
    // Eje Y
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xMin, 0, zMin),
        new THREE.Vector3(xMin, yMax, zMin)
    ]);
    const yAxis = new THREE.Line(yAxisGeometry, axesMaterial);
    scene.add(yAxis);
    axisSystem.push(yAxis);
    
    // Eje Z
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xMin, 0, zMin),
        new THREE.Vector3(xMin, 0, zMax)
    ]);
    const zAxis = new THREE.Line(zAxisGeometry, axesMaterial);
    scene.add(zAxis);
    axisSystem.push(zAxis);
    
    // Etiquetas de los ejes con medidas
    createAxisLabels(xMin, xMax, zMin, zMax, yMax);
}

function createAxisLabels(xMin, xMax, zMin, zMax, yMax) {
    // Crear canvas para texto
    function createTextTexture(text, color = '#888888', bgColor = 'transparent') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        if (bgColor !== 'transparent') {
            context.fillStyle = bgColor;
            context.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        context.fillStyle = color;
        context.font = 'Bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    // Nombre del eje X
    const xLabelTexture = createTextTexture('Variable X', '#888888');
    const xLabelMaterial = new THREE.SpriteMaterial({ map: xLabelTexture, transparent: true });
    const xLabel = new THREE.Sprite(xLabelMaterial);
    xLabel.position.set((xMin + xMax) / 2, -0.5, zMin - (zMax - zMin) * 0.1);
    xLabel.scale.set(3, 1.5, 1);
    scene.add(xLabel);
    axisSystem.push(xLabel);
    
    // Nombre del eje Y
    const yLabelTexture = createTextTexture('Densidad', '#888888');
    const yLabelMaterial = new THREE.SpriteMaterial({ map: yLabelTexture, transparent: true });
    const yLabel = new THREE.Sprite(yLabelMaterial);
    yLabel.position.set(xMin - (xMax - xMin) * 0.15, yMax / 2, zMin - (zMax - zMin) * 0.1);
    yLabel.scale.set(4, 2, 1);
    scene.add(yLabel);
    axisSystem.push(yLabel);
    
    // Nombre del eje Z
    const zLabelTexture = createTextTexture('Variable Y', '#888888');
    const zLabelMaterial = new THREE.SpriteMaterial({ map: zLabelTexture, transparent: true });
    const zLabel = new THREE.Sprite(zLabelMaterial);
    zLabel.position.set(xMin - (xMax - xMin) * 0.15, -0.5, (zMin + zMax) / 2);
    zLabel.scale.set(3, 1.5, 1);
    scene.add(zLabel);
    axisSystem.push(zLabel);
    
    // Marcadores numéricos en eje X
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
        const x = xMin + (i / xTicks) * (xMax - xMin);
        const value = x.toFixed(1);
        
        const tickTexture = createTextTexture(value, '#888888', '#ffffff');
        const tickMaterial = new THREE.SpriteMaterial({ map: tickTexture, transparent: true });
        const tick = new THREE.Sprite(tickMaterial);
        tick.position.set(x, -0.3, zMin - (zMax - zMin) * 0.05);
        tick.scale.set(1, 0.5, 1);
        scene.add(tick);
        axisSystem.push(tick);
        
        // Línea de marca
        const tickGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, zMin),
            new THREE.Vector3(x, -0.1, zMin)
        ]);
        const tickLine = new THREE.Line(tickGeometry, new THREE.LineBasicMaterial({ color: 0xaaaaaa }));
        scene.add(tickLine);
        axisSystem.push(tickLine);
    }
    
    // Marcadores numéricos en eje Y (densidad)
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const y = (i / yTicks) * yMax;
        const value = Math.round(y * 100) / 100;
        
        const tickTexture = createTextTexture(value.toString(), '#888888', '#ffffff');
        const tickMaterial = new THREE.SpriteMaterial({ map: tickTexture, transparent: true });
        const tick = new THREE.Sprite(tickMaterial);
        tick.position.set(xMin - (xMax - xMin) * 0.1, y, zMin - (zMax - zMin) * 0.05);
        tick.scale.set(1, 0.5, 1);
        scene.add(tick);
        axisSystem.push(tick);
        
        // Línea de marca
        const tickGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(xMin, y, zMin),
            new THREE.Vector3(xMin - (xMax - xMin) * 0.05, y, zMin)
        ]);
        const tickLine = new THREE.Line(tickGeometry, new THREE.LineBasicMaterial({ color: 0xaaaaaa }));
        scene.add(tickLine);
        axisSystem.push(tickLine);
    }
    
    // Marcadores numéricos en eje Z
    const zTicks = 5;
    for (let i = 0; i <= zTicks; i++) {
        const z = zMin + (i / zTicks) * (zMax - zMin);
        const value = z.toFixed(1);
        
        const tickTexture = createTextTexture(value, '#888888', '#ffffff');
        const tickMaterial = new THREE.SpriteMaterial({ map: tickTexture, transparent: true });
        const tick = new THREE.Sprite(tickMaterial);
        tick.position.set(xMin - (xMax - xMin) * 0.1, -0.3, z);
        tick.scale.set(1, 0.5, 1);
        scene.add(tick);
        axisSystem.push(tick);
        
        // Línea de marca
        const tickGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(xMin, 0, z),
            new THREE.Vector3(xMin - (xMax - xMin) * 0.05, 0, z)
        ]);
        const tickLine = new THREE.Line(tickGeometry, new THREE.LineBasicMaterial({ color: 0xaaaaaa }));
        scene.add(tickLine);
        axisSystem.push(tickLine);
    }
}

// Nueva función que usa los datos del servidor
async function fetchNormalBivariateData(mu1, mu2, sigma1, sigma2, rho) {
    try {
        const response = await fetch('/normal_bivariable', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mu1: mu1,
                mu2: mu2,
                sigma1: sigma1,
                sigma2: sigma2,
                rho: rho
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data from server:', error);
        throw error;
    }
}

function createSurface3D(surfaceData, xRange, yRange) {
    // Limpiar visualización anterior
    histogramBars.forEach(bar => scene.remove(bar));
    histogramBars = [];
    
    if (!surfaceData || surfaceData.length === 0) return;
    
    // Encontrar la densidad máxima para normalización
    maxFrequency = Math.max(...surfaceData.map(point => point.z));
    
    const xMin = xRange[0];
    const xMax = xRange[1];
    const yMin = yRange[0];
    const yMax = yRange[1];
    
    // Calcular la altura máxima basada en la densidad máxima
    const maxHeight = Math.max(3, maxFrequency * 20); // Escalar para visualización
    
    createAxisSystem(xMin, xMax, yMin, yMax, maxHeight);
    
    // Agrupar puntos en una malla para crear barras
    const gridSize = Math.sqrt(surfaceData.length);
    const xStep = (xMax - xMin) / (gridSize - 1);
    const yStep = (yMax - yMin) / (gridSize - 1);
    
    surfaceData.forEach(point => {
        if (point.z <= 0.001) return; // Omitir densidades muy bajas
        
        const height = (point.z / maxFrequency) * maxHeight;
        const barWidth = xStep * 0.8;
        const barDepth = yStep * 0.8;
        
        const geometry = new THREE.BoxGeometry(barWidth, height, barDepth);
        
        // Paleta de colores basada en densidad
        const normalizedDensity = point.z / maxFrequency;
        const color = new THREE.Color();
        
        if (normalizedDensity < 0.2) {
            color.setRGB(0.2, 0.4, 0.8); // Azul oscuro
        } else if (normalizedDensity < 0.4) {
            color.setRGB(0.3, 0.6, 0.9); // Azul medio
        } else if (normalizedDensity < 0.6) {
            color.setRGB(0.6, 0.8, 0.95); // Azul claro
        } else if (normalizedDensity < 0.8) {
            color.setRGB(0.95, 0.8, 0.6); // Naranja claro
        } else {
            color.setRGB(0.9, 0.4, 0.2); // Rojo anaranjado
        }
        
        const material = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.85,
            shininess: 50,
            emissive: new THREE.Color(0x000000)
        });
        
        const bar = new THREE.Mesh(geometry, material);
        bar.position.set(point.x, height / 2, point.y);
        bar.castShadow = true;
        bar.receiveShadow = true;
        
        // Almacenar datos para el tooltip
        bar.userData = {
            density: point.z,
            xValue: point.x,
            zValue: point.y
        };
        
        scene.add(bar);
        histogramBars.push(bar);
        
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x333333, 
            transparent: true, 
            opacity: 0.5,
            linewidth: 2
        });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        wireframe.position.copy(bar.position);
        scene.add(wireframe);
        histogramBars.push(wireframe);
    });
    
    const centerX = (xMin + xMax) / 2;
    const centerZ = (yMin + yMax) / 2;
    controls.target.set(centerX, maxHeight / 4, centerZ);
    camera.position.set(centerX + 10, 12, centerZ + 10);
}

// Función para generar muestras sintéticas para mostrar en los resultados detallados
function generateBivariateNormalSamples(n, mu1, mu2, sigma1, sigma2, rho) {
    const samples = [];
    
    for (let i = 0; i < n; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
        
        const x = mu1 + sigma1 * z0;
        const y = mu2 + sigma2 * (rho * z0 + Math.sqrt(1 - rho * rho) * z1);
        
        samples.push([x, y]);
    }
    
    return samples;
}

async function generateVisualization() {
    const numSamples = parseInt(document.getElementById('numSamples').value);
    const mu1 = parseFloat(document.getElementById('mu1').value);
    const mu2 = parseFloat(document.getElementById('mu2').value);
    const sigma1 = parseFloat(document.getElementById('sigma1').value);
    const sigma2 = parseFloat(document.getElementById('sigma2').value);
    const rho = parseFloat(document.getElementById('correlation').value);
    
    if (sigma1 <= 0 || sigma2 <= 0) {
        alert('Las desviaciones estándar deben ser positivas');
        return;
    }
    
    if (Math.abs(rho) >= 1) {
        alert('La correlación debe estar entre -0.99 y 0.99');
        return;
    }
    
    document.getElementById('loadingIndicator').style.display = 'flex';
    
    try {
        // Obtener datos del servidor
        const serverData = await fetchNormalBivariateData(mu1, mu2, sigma1, sigma2, rho);
        
        // Crear visualización con datos del servidor
        createSurface3D(serverData.superficie, serverData.x_range, serverData.y_range);
        
        // Generar muestras sintéticas para mostrar en resultados detallados
        currentSamples = generateBivariateNormalSamples(numSamples, mu1, mu2, sigma1, sigma2, rho);
        
        // Actualizar panel de estadísticas
        totalSamples = numSamples;
        document.getElementById('maxFrequency').textContent = maxFrequency.toFixed(4);
        document.getElementById('totalSamples').textContent = totalSamples.toLocaleString();
        document.getElementById('correlationDisplay').textContent = rho.toFixed(2);
        
        // Asignar variables para descarga
        resultadosSimulacion = currentSamples;
        parametrosSimulacion = {
            numSamples: numSamples, 
            mu1: mu1, 
            mu2: mu2, 
            sigma1: sigma1, 
            sigma2: sigma2, 
            rho: rho
        };
        document.getElementById('download-section').style.display = 'block';
        
        // Actualizar resultados detallados - mostrar primeros 100 pares
        const maxMostrar = Math.min(100, numSamples); // Máximo 500 para no sobrecargar la interfaz
        const resultadosAMostrar = currentSamples.slice(0, maxMostrar);
        const totalMostrados = resultadosAMostrar.length;

        let htmlResultados = `
            <div class="resumen-resultados">
                <p class="resumen-text">
                    Mostrando los primeros ${totalMostrados} pares de valores sintéticos (la superficie usa datos teóricos del servidor)
                </p>
            </div>
            <div class="resultados-grid">
        `;

        resultadosAMostrar.forEach((par, index) => {
            const numero = index + 1;
            const x = par[0];
            const y = par[1];
            
            // Clasificar por cuadrantes respecto a las medias
            const cuadrante = (x >= mu1 && y >= mu2) ? 'cuadrante-1' : 
                             (x < mu1 && y >= mu2) ? 'cuadrante-2' :
                             (x < mu1 && y < mu2) ? 'cuadrante-3' : 'cuadrante-4';
            
            htmlResultados += `
                <div class="${cuadrante} resultado-item" title="Muestra ${numero}: X=${x.toFixed(4)}, Y=${y.toFixed(4)}">
                    <div class="numero-muestra">${numero}: (${x.toFixed(2)}, ${y.toFixed(2)})</div>
                </div>
            `;
        });

        htmlResultados += `</div>`;

        // Verificar que el contenedor existe antes de actualizar
        const contenedor = document.getElementById('resultados-detallados-container');
        if (contenedor) {
            contenedor.innerHTML = htmlResultados;
        } else {
            console.warn('Elemento resultados-detallados-container no encontrado en el DOM');
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al generar la visualización: ' + error.message);
    } finally {
        document.getElementById('loadingIndicator').style.display = 'none';
    }
}

function rotateCamera(angle) {
    if (!controls) return;
    
    const target = controls.target;
    const position = camera.position;
    const vector = new THREE.Vector3().subVectors(position, target);
    const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    vector.applyQuaternion(quaternion);
    camera.position.copy(target).add(vector);
}

function resetCameraView() {
    if (!controls) return;
    controls.reset();
}

function downloadPNG() {
    const link = document.createElement('a');
    link.download = 'superficie_normal_bivariable.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
}

function downloadCSV() {
    if (currentSamples.length === 0) {
        alert('Primero debe generar la visualización');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Variable X,Variable Y\n";
    currentSamples.forEach(sample => {
        csvContent += `${sample[0]},${sample[1]}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'muestras_normal_bivariable.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadJSON() {
    const config = {
        numSamples: parseInt(document.getElementById('numSamples').value),
        mu1: parseFloat(document.getElementById('mu1').value),
        mu2: parseFloat(document.getElementById('mu2').value),
        sigma1: parseFloat(document.getElementById('sigma1').value),
        sigma2: parseFloat(document.getElementById('sigma2').value),
        correlation: parseFloat(document.getElementById('correlation').value),
        date: new Date().toISOString()
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', 'configuracion_normal_bivariable.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', function() {
    initThreeJS();
    
    const correlationSlider = document.getElementById('correlation');
    const correlationValue = document.getElementById('correlationValue');
    
    correlationSlider.addEventListener('input', function() {
        correlationValue.textContent = parseFloat(this.value).toFixed(2);
    });
    
    document.getElementById('btnGenerar').addEventListener('click', generateVisualization);
    
    document.getElementById('btnRotateLeft').addEventListener('click', function() {
        rotateCamera(-Math.PI / 12);
    });
    
    document.getElementById('btnRotateRight').addEventListener('click', function() {
        rotateCamera(Math.PI / 12);
    });
    
    document.getElementById('btnResetView').addEventListener('click', resetCameraView);
    
    document.getElementById('btnDownloadPNG').addEventListener('click', downloadPNG);
    document.getElementById('btnDownloadCSV').addEventListener('click', downloadCSV);
    document.getElementById('btnDownloadJSON').addEventListener('click', downloadJSON);
    
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    setTimeout(generateVisualization, 500);

    // Función de descarga
    document.getElementById('btnDescargar').addEventListener('click', () => {
        if (!resultadosSimulacion || resultadosSimulacion.length === 0) {
            alert('No hay resultados para descargar');
            return;
        }
        
        let contenido = '======== SIMULACION NORMAL BIVARIABLE ========\n\n';
        contenido += `Parámetros: n=${parametrosSimulacion.numSamples}, μ₁=${parametrosSimulacion.mu1}, μ₂=${parametrosSimulacion.mu2}, σ₁=${parametrosSimulacion.sigma1}, σ₂=${parametrosSimulacion.sigma2}, ρ=${parametrosSimulacion.rho}\n\n`;
        
        contenido += 'ESTADÍSTICAS:\n';
        contenido += `Superficie teórica calculada por el servidor\n`;
        contenido += `Densidad máxima: ${maxFrequency.toFixed(4)}\n`;
        contenido += `Correlación: ${parametrosSimulacion.rho.toFixed(2)}\n\n`;
        
        contenido += 'MUESTRAS SINTÉTICAS GENERADAS (para visualización):\n';
        resultadosSimulacion.forEach((sample, index) => {
            contenido += `Muestra ${index + 1}: X=${sample[0].toFixed(4)}, Y=${sample[1].toFixed(4)}\n`;
        });
        
        // Crear y descargar archivo
        const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'resultados_normal_bivariable.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});