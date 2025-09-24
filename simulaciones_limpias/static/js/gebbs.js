let resultadosSimulacion = null;
let parametrosSimulacion = null;    
    
    // Inicializar tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    const btnGenerarGibbs = document.getElementById('btnGenerarGibbs');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Variables para Three.js
    let scene, camera, renderer, controls;
    let histogramBars = [];
    let samplePoints = [];
    let theoreticalSurface = null;
    let axisSystem = null;
    let hoverTooltip = null;
    let raycaster, mouse;
    let maxFrequency = 0;
    let totalSamples = 0;

    // Variables para almacenar datos de la última simulación
    let lastSimulationData = null;
    let lastHistogramData = null;
    let lastGridSize = 20;

    // Función para inicializar Three.js
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
        hoverTooltip.className = 'tooltip';
        container.appendChild(hoverTooltip);
        
        // Event listeners para interacción
        container.addEventListener('mousemove', onMouseMove);
        
        // Iluminación mejorada
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
        
        // Crear sistema de ejes base con rango extendido
        createAxisSystem(-2, 4, -2, 4, 1);
        
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
        const intersects = raycaster.intersectObjects(histogramBars.filter(bar => bar.isMesh));
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            const frequency = object.userData.frequency;
            const xValue = object.userData.xValue;
            const zValue = object.userData.zValue;
            const density = object.userData.density;
            
            // Mostrar tooltip
            hoverTooltip.style.display = 'block';
            hoverTooltip.style.left = (event.clientX - rect.left + 10) + 'px';
            hoverTooltip.style.top = (event.clientY - rect.top) + 'px';
            hoverTooltip.innerHTML = `
                <div>X: ${xValue.toFixed(2)}</div>
                <div>Y: ${zValue.toFixed(2)}</div>
                <div>Frecuencia: ${frequency}</div>
                <div>Densidad: ${density.toFixed(4)}</div>
            `;
            
            // Resaltar la barra
            object.material.emissive = new THREE.Color(0x333333);
            object.material.needsUpdate = true;
        } else {
            hoverTooltip.style.display = 'none';
            
            // Restaurar todas las barras
            histogramBars.forEach(bar => {
                if (bar.isMesh && bar.material && bar.material.emissive) {
                    bar.material.emissive = new THREE.Color(0x000000);
                    bar.material.needsUpdate = true;
                }
            });
        }
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

    // Función para crear sistema de ejes con etiquetas
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
        
        // Ejes en negro
        const axesMaterial = new THREE.LineBasicMaterial({ color: 0x555555, linewidth: 2 });
        
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
        
        // Flechas para los ejes
        function addArrow(origin, direction, color) {
            const arrowHelper = new THREE.ArrowHelper(
                direction.clone().normalize(),
                origin,
                direction.length(),
                color,
                0.2,
                0.1
            );
            scene.add(arrowHelper);
            axisSystem.push(arrowHelper);
        }
        
        addArrow(new THREE.Vector3(xMax, 0, zMin), new THREE.Vector3(0.5, 0, 0), 0x555555);
        addArrow(new THREE.Vector3(xMin, yMax, zMin), new THREE.Vector3(0, 0.5, 0), 0x555555);
        addArrow(new THREE.Vector3(xMin, 0, zMax), new THREE.Vector3(0, 0, 0.5), 0x555555);
        
        // Crear canvas para texto
        function createTextTexture(text, color = '#555555', bgColor = 'transparent') {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 128;
            
            if (bgColor !== 'transparent') {
                context.fillStyle = bgColor;
                context.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            context.fillStyle = color;
            context.font = 'Bold 36px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);
            
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        }
        
        // Etiqueta para el eje X
        const xLabelTexture = createTextTexture('Variable X', '#555555');
        const xLabelMaterial = new THREE.SpriteMaterial({ map: xLabelTexture, transparent: true });
        const xLabel = new THREE.Sprite(xLabelMaterial);
        xLabel.position.set(xMax + 0.3, 0, zMin);
        xLabel.scale.set(1.5, 0.75, 1);
        scene.add(xLabel);
        axisSystem.push(xLabel);
        
        // Etiqueta para el eje Y
        const yLabelTexture = createTextTexture('Frecuencia', '#555555');
        const yLabelMaterial = new THREE.SpriteMaterial({ map: yLabelTexture, transparent: true });
        const yLabel = new THREE.Sprite(yLabelMaterial);
        yLabel.position.set(xMin, yMax + 0.3, zMin);
        yLabel.scale.set(2, 1, 1);
        scene.add(yLabel);
        axisSystem.push(yLabel);
        
        // Etiqueta para el eje Z
        const zLabelTexture = createTextTexture('Variable Y', '#555555');
        const zLabelMaterial = new THREE.SpriteMaterial({ map: zLabelTexture, transparent: true });
        const zLabel = new THREE.Sprite(zLabelMaterial);
        zLabel.position.set(xMin, 0, zMax + 0.3);
        zLabel.scale.set(1.5, 0.75, 1);
        scene.add(zLabel);
        axisSystem.push(zLabel);
        
        // Marcadores numéricos en eje X
        for (let i = xMin; i <= xMax; i += 1) {
            const tickTexture = createTextTexture(i.toFixed(0), '#555555', '#ffffff');
            const tickMaterial = new THREE.SpriteMaterial({ map: tickTexture, transparent: true });
            const tick = new THREE.Sprite(tickMaterial);
            tick.position.set(i, -0.2, zMin - 0.2);
            tick.scale.set(0.5, 0.25, 1);
            scene.add(tick);
            axisSystem.push(tick);
        }
        
        // Marcadores numéricos en eje Z
        for (let i = zMin; i <= zMax; i += 1) {
            const tickTexture = createTextTexture(i.toFixed(0), '#555555', '#ffffff');
            const tickMaterial = new THREE.SpriteMaterial({ map: tickTexture, transparent: true });
            const tick = new THREE.Sprite(tickMaterial);
            tick.position.set(xMin - 0.2, -0.2, i);
            tick.scale.set(0.5, 0.25, 1);
            scene.add(tick);
            axisSystem.push(tick);
        }
    }

    // Función para simular el muestreo de Gibbs - CORREGIDA
    function gibbsSampling(n, burn_in, x0, y0) {
        let x = x0;
        let y = y0;
        const xs = [];
        const ys = [];
        const all_samples = []; // Para almacenar todas las muestras (incluyendo burn-in)
        
        // Función para muestrear de una distribución condicional usando el método de rechazo
        function sampleConditional(conditionalFunc, param, isX) {
            const maxTries = 1000;
            let tryCount = 0;
            
            // Rango ampliado para la propuesta (para permitir valores fuera de [0,2])
            const min = -2;
            const max = 4;
            
            // Estimamos el máximo de la función condicional en [0,2]
            let maxVal = 0;
            for (let test = 0; test <= 2; test += 0.01) {
                const density = conditionalFunc(test, param);
                if (density > maxVal) maxVal = density;
            }
            
            // Aseguramos un máximo mínimo para evitar división por cero
            maxVal = Math.max(maxVal, 0.001);
            
            while (tryCount < maxTries) {
                // Generar una propuesta uniforme en [min, max]
                const proposal = Math.random() * (max - min) + min;
                const density = conditionalFunc(proposal, param);
                
                // Aceptar con probabilidad density/maxVal
                if (Math.random() < density / maxVal) {
                    return proposal;
                }
                tryCount++;
            }
            
            // Si no se acepta después de maxTries, devolver un valor dentro del rango [0,2]
            return Math.random() * 2;
        }
        
        // Definir las funciones condicionales
        function conditionalX(x, y) {
            // f(x|y) = (2x + 3y + 2) / (8 + 6y) para x en [0,2], 0 en otro caso
            if (x < 0 || x > 2) return 0;
            return (2*x + 3*y + 2) / (8 + 6*y);
        }
        
        function conditionalY(y, x) {
            // f(y|x) = (2x + 3y + 2) / (4x + 10) para y en [0,2], 0 en otro caso
            if (y < 0 || y > 2) return 0;
            return (2*x + 3*y + 2) / (4*x + 10);
        }
        
        // Fase de burn-in (no almacenamos estas muestras)
        for (let i = 0; i < burn_in; i++) {
            // Muestrear X|Y
            x = sampleConditional(conditionalX, y, true);
            
            // Muestrear Y|X
            y = sampleConditional(conditionalY, x, false);
            
            // Almacenar muestra de burn-in (para depuración)
            all_samples.push({x, y, iteration: i, is_burn_in: true});
        }
        
        // Fase de muestreo (almacenamos estas muestras)
        for (let i = 0; i < n; i++) {
            // Muestrear X|Y
            x = sampleConditional(conditionalX, y, true);
            
            // Muestrear Y|X
            y = sampleConditional(conditionalY, x, false);
            
            xs.push(x);
            ys.push(y);
            
            // Almacenar muestra (para depuración)
            all_samples.push({x, y, iteration: i + burn_in, is_burn_in: false});
        }
        
        // Para depuración: mostrar algunas muestras en la consola
        console.log("Primeras 10 muestras (incluyendo burn-in):", all_samples.slice(0, 10));
        console.log("Últimas 10 muestras:", all_samples.slice(-10));
        
        return { xs, ys, all_samples };
    }

    function calcularEstadisticas(xs, ys) {
        if (xs.length === 0 || ys.length === 0) return {};
        
        // Filtrar valores dentro del rango [0,2] para estadísticas
        const filteredXs = xs.filter(x => x >= 0 && x <= 2);
        const filteredYs = ys.filter(y => y >= 0 && y <= 2);
        
        const mediaX = filteredXs.reduce((a, b) => a + b, 0) / filteredXs.length;
        const mediaY = filteredYs.reduce((a, b) => a + b, 0) / filteredYs.length;
        
        const varianzaX = filteredXs.reduce((a, b) => a + Math.pow(b - mediaX, 2), 0) / filteredXs.length;
        const varianzaY = filteredYs.reduce((a, b) => a + Math.pow(b - mediaY, 2), 0) / filteredYs.length;
        
        let covarianza = 0;
        for (let i = 0; i < filteredXs.length; i++) {
            covarianza += (filteredXs[i] - mediaX) * (filteredYs[i] - mediaY);
        }
        covarianza /= filteredXs.length;
        
        const correlacion = covarianza / (Math.sqrt(varianzaX) * Math.sqrt(varianzaY));
        
        return { mediaX, mediaY, varianzaX, varianzaY, correlacion };
    }

    function create2DHistogram(xs, ys, gridSize) {
        const xMin = 0, xMax = 2;
        const yMin = 0, yMax = 2;
        
        const xStep = (xMax - xMin) / gridSize;
        const yStep = (yMax - yMin) / gridSize;
        
        const counts = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
        
        // Contar solo puntos dentro del rango [0,2]
        for (let i = 0; i < xs.length; i++) {
            const x = xs[i];
            const y = ys[i];
            
            if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
                const xIndex = Math.min(Math.floor((x - xMin) / xStep), gridSize - 1);
                const yIndex = Math.min(Math.floor((y - yMin) / yStep), gridSize - 1);
                
                counts[yIndex][xIndex]++;
            }
        }
        
        totalSamples = xs.length;
        const cellArea = xStep * yStep;
        const density = counts.map(row => 
            row.map(count => count / (totalSamples * cellArea))
        );
        
        return { counts, density, xStep, yStep };
    }

    // Función para crear el histograma 3D con degradado en cada barra
    function create3DHistogram(density, gridSize, xStep, yStep) {
        histogramBars.forEach(bar => scene.remove(bar));
        histogramBars = [];
        
        const maxDensity = Math.max(...density.flat());
        if (maxDensity === 0) return;
        
        maxFrequency = Math.max(...lastHistogramData.counts.flat());
        
        // Actualizar estadísticas
        document.getElementById('maxFrequency').textContent = maxFrequency.toLocaleString();
        
        // Calcular la altura máxima basada en la densidad máxima
        const maxHeight = Math.max(1.5, maxDensity * 5);
        
        // Actualizar sistema de ejes para el histograma (solo [0,2])
        createAxisSystem(-1, 3, -1, 3, maxHeight);
        
        // Paleta de colores - degradado de azul a morado
        const colorScale = [
            new THREE.Color(0x4cc9f0), // Azul claro
            new THREE.Color(0x4361ee), 
            new THREE.Color(0x7209b7), // Morado medio
            new THREE.Color(0x3a0ca3), 
            new THREE.Color(0x240046)  // Morado oscuro
        ];
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cellDensity = density[i][j];
                const cellFrequency = lastHistogramData.counts[i][j];
                
                if (cellDensity === 0) continue;
                
                const height = (cellDensity / maxDensity) * maxHeight;
                const x = j * xStep + xStep / 2;
                const z = i * yStep + yStep / 2;
                const y = height / 2;
                
                // Selección de color basada en densidad
                const colorRatio = cellDensity / maxDensity;
                const colorIndex = Math.floor(colorRatio * (colorScale.length - 1));
                const nextColorIndex = Math.min(colorIndex + 1, colorScale.length - 1);
                const localRatio = (colorRatio * (colorScale.length - 1)) - colorIndex;
                
                const baseColor = new THREE.Color().copy(colorScale[colorIndex]).lerp(colorScale[nextColorIndex], localRatio);
                
                // Crear material con degradado para cada barra
                const topColor = new THREE.Color().copy(baseColor).multiplyScalar(0.7); // Color más oscuro en la parte superior
                
                // Crear geometría para la barra
                const geometry = new THREE.BoxGeometry(xStep * 0.9, height, yStep * 0.9);
                
                // Crear atributos de color para degradado
                const colors = [];
                const positionAttribute = geometry.getAttribute('position');
                
                for (let v = 0; v < positionAttribute.count; v++) {
                    const yPos = positionAttribute.getY(v);
                    const normalizedY = (yPos + height/2) / height; // Normalizar entre 0 y 1
                    
                    // Interpolar entre baseColor y topColor basado en la altura
                    const color = new THREE.Color().copy(baseColor).lerp(topColor, normalizedY);
                    colors.push(color.r, color.g, color.b);
                }
                
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                
                // Material con vertex colors
                const material = new THREE.MeshPhongMaterial({
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.85,
                    shininess: 70,
                    specular: new THREE.Color(0x111111)
                });
                
                const bar = new THREE.Mesh(geometry, material);
                bar.position.set(x, y, z);
                bar.castShadow = true;
                bar.receiveShadow = true;
                
                // Almacenar datos para el tooltip
                bar.userData = {
                    frequency: cellFrequency,
                    density: cellDensity,
                    xValue: j * xStep,
                    zValue: i * yStep
                };
                
                scene.add(bar);
                histogramBars.push(bar);
                
                // Efecto de borde
                const edges = new THREE.EdgesGeometry(geometry);
                const edgeMaterial = new THREE.LineBasicMaterial({ 
                    color: 0x333333, 
                    transparent: true, 
                    opacity: 0.5,
                    linewidth: 1.5
                });
                const wireframe = new THREE.LineSegments(edges, edgeMaterial);
                wireframe.position.copy(bar.position);
                scene.add(wireframe);
                histogramBars.push(wireframe);
            }
        }
        
        const centerX = 1;
        const centerZ = 1;
        controls.target.set(centerX, maxHeight / 4, centerZ);
        camera.position.set(centerX + 5, maxHeight * 1.5, centerZ + 5);
    }

    // Función para crear puntos de muestra
    function createSamplePoints(xs, ys) {
        samplePoints.forEach(point => scene.remove(point));
        samplePoints = [];
        
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        
        const sampleSize = Math.min(2000, xs.length);
        const step = Math.max(1, Math.floor(xs.length / sampleSize));
        
        // Crear gradiente de colores para los puntos
        const pointColor1 = new THREE.Color(0xff4444);
        const pointColor2 = new THREE.Color(0xff8888);
        
        for (let i = 0; i < xs.length; i += step) {
            const x = xs[i];
            const y = ys[i];
            
            // Solo mostrar puntos dentro del rango [0,2]
            if (x >= 0 && x <= 2 && y >= 0 && y <= 2) {
                positions.push(x, 0.05, y);
                // Color aleatorio entre dos tonos para puntos dentro del rango
                const t = Math.random();
                const color = new THREE.Color().copy(pointColor1).lerp(pointColor2, t);
                colors.push(color.r, color.g, color.b);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 3,
            sizeAttenuation: false,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });
        
        const points = new THREE.Points(geometry, material);
        scene.add(points);
        samplePoints.push(points);
    }

    // Función para superficie teórica
    function createTheoreticalSurface(gridSize, maxDensity, maxHeight) {
        if (theoreticalSurface) {
            scene.remove(theoreticalSurface);
        }
        
        const xMin = 0, xMax = 2;
        const yMin = 0, yMax = 2;
        
        const xStep = (xMax - xMin) / gridSize;
        const yStep = (yMax - yMin) / gridSize;
        
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const colors = [];
        
        // Crear superficie teórica alineada con el histograma
        for (let i = 0; i <= gridSize; i++) {
            for (let j = 0; j <= gridSize; j++) {
                const x = j * xStep;
                const yVal = i * yStep;
                const theoreticalDensity = (1/28) * (2*x + 3*yVal + 2);
                const height = (theoreticalDensity / maxDensity) * maxHeight;
                
                vertices.push(x, height, yVal);
                
                // Color basado en la altura (similar a las barras)
                const colorRatio = theoreticalDensity / maxDensity;
                const colorScale = [
                    new THREE.Color(0x4cc9f0),
                    new THREE.Color(0x4361ee),
                    new THREE.Color(0x7209b7),
                    new THREE.Color(0x3a0ca3),
                    new THREE.Color(0x240046)
                ];
                
                const colorIndex = Math.floor(colorRatio * (colorScale.length - 1));
                const nextColorIndex = Math.min(colorIndex + 1, colorScale.length - 1);
                const localRatio = (colorRatio * (colorScale.length - 1)) - colorIndex;
                
                const color = new THREE.Color().copy(colorScale[colorIndex]).lerp(colorScale[nextColorIndex], localRatio);
                colors.push(color.r, color.g, color.b);
            }
        }
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const a = i * (gridSize + 1) + j;
                const b = a + 1;
                const c = a + (gridSize + 1);
                const d = c + 1;
                
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }
        
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            wireframe: false,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            shininess: 80,
            specular: new THREE.Color(0x111111)
        });
        
        theoreticalSurface = new THREE.Mesh(geometry, material);
        scene.add(theoreticalSurface);
        
        // Añadir wireframe para mejor definición
        const edges = new THREE.WireframeGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000, 
            transparent: true, 
            opacity: 0.2,
            linewidth: 1
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        theoreticalSurface.add(wireframe);
    }

    

    // Función para actualizar la visualización
    function updateVisualization() {
        if (!lastSimulationData || !lastHistogramData) return;
        
        // Limpiar visualización anterior
        histogramBars.forEach(bar => scene.remove(bar));
        samplePoints.forEach(point => scene.remove(point));
        if (theoreticalSurface) scene.remove(theoreticalSurface);
        
        histogramBars = [];
        samplePoints = [];
        theoreticalSurface = null;
        
        const maxDensity = Math.max(...lastHistogramData.density.flat());
        const maxHeight = Math.max(1.5, maxDensity * 5);
        
        // Mostrar elementos según switches
        if (document.getElementById('showHistogram').checked) {
            create3DHistogram(lastHistogramData.density, lastGridSize, lastHistogramData.xStep, lastHistogramData.yStep);
        }
        
        if (document.getElementById('showPoints').checked) {
            createSamplePoints(lastSimulationData.xs, lastSimulationData.ys);
        }
        
        if (document.getElementById('showTheoretical').checked && maxDensity > 0) {
            createTheoreticalSurface(lastGridSize, maxDensity, maxHeight);
        }
    }

    // Funciones para controles de cámara
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
        link.download = 'histograma_gibbs.png';
        link.href = renderer.domElement.toDataURL('image/png');
        link.click();
    }

    // Event listener principal
    btnGenerarGibbs.addEventListener('click', () => {
        const n = parseInt(document.getElementById('numMuestras').value);
        const burnIn = parseInt(document.getElementById('burnIn').value);
        const x0 = parseFloat(document.getElementById('x0').value);
        const y0 = parseFloat(document.getElementById('y0').value);
        const gridSize = parseInt(document.getElementById('gridSize').value);
        
        if (isNaN(n) || n <= 0) {
            alert("Por favor, ingrese un número válido de muestras (n > 0)");
            return;
        }
        
        if (isNaN(burnIn) || burnIn < 0) {
            alert("Por favor, ingrese un valor válido para burn-in (≥ 0)");
            return;
        }

        loadingIndicator.style.display = 'flex';
        btnGenerarGibbs.disabled = true;

        // Simular con un pequeño retardo para permitir que se muestre el indicador de carga
        setTimeout(() => {
            try {
                // Generar datos con el método de Gibbs
                const data = gibbsSampling(n, burnIn, x0, y0);
                
                // Guardar datos de la simulación
                lastSimulationData = data;
                lastGridSize = gridSize;
                
                const stats = calcularEstadisticas(data.xs, data.ys);
                
                document.getElementById('mediaX').textContent = stats.mediaX.toFixed(4);
                document.getElementById('mediaY').textContent = stats.mediaY.toFixed(4);
                document.getElementById('varianzaX').textContent = stats.varianzaX.toFixed(4);
                document.getElementById('varianzaY').textContent = stats.varianzaY.toFixed(4);
                document.getElementById('correlacion').textContent = stats.correlacion.toFixed(4);
                
                // Calcular histograma y guardarlo
                lastHistogramData = create2DHistogram(data.xs, data.ys, gridSize);

                resultadosSimulacion = data;
                parametrosSimulacion = {n: n, burnIn: burnIn, x0: x0, y0: y0};
                document.getElementById('download-section').style.display = 'block';
                
                // Actualizar visualización
                updateVisualization();
                
            } catch (error) {
                console.error('Error:', error);
                alert('Error al generar la simulación: ' + error.message);
            } finally {
                loadingIndicator.style.display = 'none';
                btnGenerarGibbs.disabled = false;
            }
        }, 100);
    });

    // Event listeners para controles de visualización
    document.getElementById('showHistogram').addEventListener('change', updateVisualization);
    document.getElementById('showPoints').addEventListener('change', updateVisualization);
    document.getElementById('showTheoretical').addEventListener('change', updateVisualization);

    // Event listeners para controles de cámara
    document.getElementById('btnRotateLeft').addEventListener('click', () => rotateCamera(-Math.PI / 12));
    document.getElementById('btnRotateRight').addEventListener('click', () => rotateCamera(Math.PI / 12));
    document.getElementById('btnResetView').addEventListener('click', resetCameraView);
    document.getElementById('btnDownloadPNG').addEventListener('click', downloadPNG);


    // Función de descarga
document.getElementById('btnDescargar').addEventListener('click', () => {
    if (!resultadosSimulacion) {
        alert('No hay resultados para descargar');
        return;
    }
    
    let contenido = '======== SIMULACION GIBBS SAMPLING ========\n\n';
    contenido += `Parámetros: muestras=${parametrosSimulacion.n}, burn-in=${parametrosSimulacion.burnIn}, X₀=${parametrosSimulacion.x0}, Y₀=${parametrosSimulacion.y0}\n\n`;
    
    // Calcular estadísticas para el archivo
    const stats = calcularEstadisticas(resultadosSimulacion.xs, resultadosSimulacion.ys);
    contenido += 'ESTADÍSTICAS:\n';
    contenido += `Media X: ${stats.mediaX.toFixed(4)}    Media Y: ${stats.mediaY.toFixed(4)}\n`;
    contenido += `Varianza X: ${stats.varianzaX.toFixed(4)}    Varianza Y: ${stats.varianzaY.toFixed(4)}\n`;
    contenido += `Correlación: ${stats.correlacion.toFixed(4)}\n\n`;
    
    contenido += 'MUESTRAS GENERADAS:\n';
    for (let i = 0; i < resultadosSimulacion.xs.length; i++) {
        contenido += `Muestra ${i + 1}: X=${resultadosSimulacion.xs[i].toFixed(4)}, Y=${resultadosSimulacion.ys[i].toFixed(4)}\n`;
    }
    
    // Crear y descargar archivo
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'resultados_gibbs.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

    // Inicializar al cargar la página
    window.addEventListener('load', () => {
        initThreeJS();
        // Generar una simulación inicial
        setTimeout(() => btnGenerarGibbs.click(), 100);
    });