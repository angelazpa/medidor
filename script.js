document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const dlSpeed = document.getElementById('dlSpeed');
    const ulSpeed = document.getElementById('ulSpeed');
    const pingText = document.getElementById('pingText');
    const jitterText = document.getElementById('jitterText');
    const avgSpeed = document.getElementById('avgSpeed');
    const needle = document.getElementById('needle');
    const gauge = document.querySelector('.gauge');
    const detailedStatus = document.getElementById('detailedStatus');
    const timelineContainer = document.getElementById('timelineContainer');

    let testActive = false;
    let testStartTime = 0;

    // Inicializar partículas
    initParticles();

    // Configurar LibreSpeed
    const s = new Speedtest();
    
    // Configuración del test
    s.setParameter("time_ul", 10);
    s.setParameter("time_dl", 10);
    s.setParameter("count_ping", 5);
    s.setParameter("url_dl", "garbage.php");
    s.setParameter("url_ul", "empty.php");
    s.setParameter("url_ping", "empty.php");
    s.setParameter("url_getIp", "getIP.php");
    s.setParameter("telemetry_level", 0); // Desactivar telemetría para pruebas

    s.onupdate = (data) => {
        if (!testActive) return;

        console.log("Datos del test:", data); // Para debugging

        // USAR LOS NOMBRES CORRECTOS DE LAS PROPIEDADES
        if (data.dlStatus !== undefined && data.dlStatus !== "" && data.dlStatus !== "Fail") {
            dlSpeed.textContent = parseFloat(data.dlStatus).toFixed(1);
        }
        if (data.ulStatus !== undefined && data.ulStatus !== "" && data.ulStatus !== "Fail") {
            ulSpeed.textContent = parseFloat(data.ulStatus).toFixed(1);
        }
        if (data.pingStatus !== undefined && data.pingStatus !== "" && data.pingStatus !== "Fail") {
            pingText.textContent = parseFloat(data.pingStatus).toFixed(1);
        }
        if (data.jitterStatus !== undefined && data.jitterStatus !== "" && data.jitterStatus !== "Fail") {
            jitterText.textContent = parseFloat(data.jitterStatus).toFixed(1);
        }

        // Calcular velocidad promedio
        const dl = parseFloat(data.dlStatus) || 0;
        const ul = parseFloat(data.ulStatus) || 0;
        const avg = dl > 0 && ul > 0 ? (dl + ul) / 2 : (dl > 0 ? dl : (ul > 0 ? ul : 0));
        
        if (avg > 0) {
            avgSpeed.textContent = avg.toFixed(1);
            updateSpeedometer(avg);
        }

        // Actualizar estado detallado
        updateDetailedStatus(data);
        
        // Actualizar timeline
        updateTimeline(data);
        
        // Actualizar countdown
        updateCountdown(data);
    };

    s.onend = (aborted) => {
        testActive = false;
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-redo"></i> REPETIR PRUEBA';
        
        if (aborted) {
            detailedStatus.textContent = "Prueba cancelada";
            showNotification("Prueba cancelada", "error");
        } else {
            detailedStatus.textContent = "¡Prueba completada!";
            showNotification("Prueba finalizada exitosamente", "success");
            
            // Mostrar resultados finales
            setTimeout(() => {
                const finalDl = dlSpeed.textContent;
                const finalUl = ulSpeed.textContent;
                const finalPing = pingText.textContent;
                detailedStatus.textContent = `Finalizado: ${finalDl} Mbps ↓ / ${finalUl} Mbps ↑ / ${finalPing} ms`;
            }, 1000);
        }
        
        // Ocultar timeline después de un delay
        setTimeout(() => {
            timelineContainer.style.display = 'none';
        }, 3000);
    };

    startBtn.addEventListener('click', () => {
        if (testActive) return;

        // Resetear interfaz
        resetInterface();
        
        // Configurar y empezar test
        testActive = true;
        testStartTime = Date.now();
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROBANDO...';
        detailedStatus.textContent = "Iniciando prueba...";
        timelineContainer.style.display = 'block';

        // Usar servidor por defecto (configuración básica)
        s.setSelectedServer({
            "name": "Servidor Principal",
            "server": "", // Se usará relativo al dominio actual
            "dlURL": "garbage.php",
            "ulURL": "empty.php",
            "pingURL": "empty.php",
            "getIpURL": "getIP.php"
        });

        s.start();
    });

    // === FUNCIONES AUXILIARES ===

    function resetInterface() {
        // Resetear valores
        dlSpeed.textContent = '—';
        ulSpeed.textContent = '—';
        pingText.textContent = '—';
        jitterText.textContent = '—';
        avgSpeed.textContent = '—';
        
        // Resetear medidor
        needle.style.transform = 'rotate(-135deg)';
        gauge.style.setProperty('--progress', '0');
        
        // Resetear timeline
        document.querySelectorAll('.timeline-step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
        document.getElementById('step1').classList.add('active');
        
        // Resetear barras de progreso
        document.getElementById('timelineProgress').style.width = '0%';
        document.getElementById('timelineConnectorProgress').style.width = '0%';
    }

    function updateSpeedometer(speed) {
        const maxMbps = 1000;
        const progress = Math.min(speed / maxMbps, 1);
        const angle = -135 + (progress * 270); // De -135° a +135°
        
        needle.style.transform = `rotate(${angle}deg)`;
        gauge.style.setProperty('--progress', progress * 100);
    }

    function updateDetailedStatus(data) {
        const states = {
            0: "Preparando...",
            1: "Probando descarga...",
            2: "Probando ping y jitter...", 
            3: "Probando subida...",
            4: "Finalizando..."
        };
        
        if (data.testState !== undefined && states[data.testState]) {
            detailedStatus.textContent = states[data.testState];
        }
    }

    function updateTimeline(data) {
        const steps = document.querySelectorAll('.timeline-step');
        const progress = document.getElementById('timelineProgress');
        const connectorProgress = document.getElementById('timelineConnectorProgress');
        
        // Resetear todos los pasos
        steps.forEach(step => {
            step.classList.remove('active', 'completed');
        });
        
        // Marcar pasos completados y activos según el estado
        if (data.testState >= 1) {
            document.getElementById('step1').classList.add('completed');
            progress.style.width = '25%';
        }
        if (data.testState >= 2) {
            document.getElementById('step2').classList.add('completed');
            progress.style.width = '50%';
            connectorProgress.style.width = '33%';
        }
        if (data.testState >= 3) {
            document.getElementById('step3').classList.add('completed');
            progress.style.width = '75%';
            connectorProgress.style.width = '66%';
        }
        if (data.testState >= 4) {
            document.getElementById('step4').classList.add('completed');
            progress.style.width = '100%';
            connectorProgress.style.width = '100%';
        }
        
        // Activar paso actual
        if (data.testState >= 1 && data.testState <= 4) {
            document.getElementById('step' + data.testState).classList.add('active');
        }
    }

    function updateCountdown(data) {
        const countdown = document.getElementById('timeRemaining');
        const elapsed = (Date.now() - testStartTime) / 1000;
        const remaining = Math.max(0, 15 - Math.floor(elapsed));
        
        countdown.textContent = `${remaining}s`;
    }

    function showNotification(message, type = "info") {
        const notif = document.getElementById('notification');
        notif.className = `notification ${type} show`;
        const icons = { 
            success: 'check-circle', 
            error: 'exclamation-triangle', 
            info: 'info-circle', 
            warning: 'exclamation-circle' 
        };
        notif.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${message}`;
        
        setTimeout(() => {
            notif.classList.remove('show');
        }, 3000);
    }

    function initParticles() {
        const container = document.getElementById('particles');
        const colors = ['#13ccd9', '#00ff88', '#ffcc00', '#ff3366'];
        
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.classList.add('particle');
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `${Math.random() * 100}%`;
            p.style.width = `${Math.random() * 6 + 2}px`;
            p.style.height = p.style.width;
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            p.style.setProperty('--tx', `${(Math.random() - 0.5) * 100}px`);
            p.style.setProperty('--ty', `${(Math.random() - 0.5) * 100}px`);
            p.style.animationDuration = `${Math.random() * 10 + 10}s`;
            p.style.animationDelay = `${Math.random() * 5}s`;
            container.appendChild(p);
        }
    }
});