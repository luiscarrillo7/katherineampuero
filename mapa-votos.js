let votos = {};

document.addEventListener("DOMContentLoaded", async () => {
  const contenedorChecks = document.getElementById("contenedor-checkboxes");
  const btnGenerar = document.getElementById("btn-generar");
  const btnTodos = document.getElementById("btn-todos");
  const btnNinguno = document.getElementById("btn-ninguno");

  // 1. Cargar votos_por_region.json y crear checkboxes automáticamente
  try {
    const respuesta = await fetch("votos_por_region.json");
    votos = await respuesta.json();

    const departamentos = Object.keys(votos).sort((a, b) => a.localeCompare(b, "es"));

    departamentos.forEach((dep) => {
      const div = document.createElement("div");
      div.className = "checkbox-item";
      div.innerHTML = `
        <input type="checkbox" id="chk-${dep}" value="${dep}">
        <label for="chk-${dep}">${dep}</label>
      `;
      contenedorChecks.appendChild(div);
    });
  } catch (error) {
    console.error("Error cargando votos_por_region.json:", error);
    contenedorChecks.innerHTML =
      "<p style='color:red'>No se pudo cargar votos_por_region.json. Verifica que esté en la misma carpeta y que estés usando un servidor local (ej. Live Server).</p>";
  }

  // 2. Marcar / Desmarcar todos
  btnTodos.addEventListener("click", () => {
    document.querySelectorAll(".checkbox-item input").forEach((chk) => (chk.checked = true));
  });
  btnNinguno.addEventListener("click", () => {
    document.querySelectorAll(".checkbox-item input").forEach((chk) => (chk.checked = false));
  });

  // 3. Generar el mapa con líneas y tarjetas de votos
  btnGenerar.addEventListener("click", generarInfografia);
});

function generarInfografia() {
  const seleccionados = [...document.querySelectorAll(".checkbox-item input:checked")].map(
    (c) => c.value
  );

  if (seleccionados.length === 0) {
    alert("Por favor, selecciona al menos un departamento.");
    return;
  }

  const svg = document.querySelector("#mapa-centro svg");
  if (!svg) {
    alert(
      "No encontré el SVG del mapa dentro de #mapa-centro.\nPega tu <svg>...</svg> completo en ese lugar del HTML antes de generar."
    );
    return;
  }

  const gLabelPoints = svg.querySelector("#label_points");
  if (!gLabelPoints) {
    alert(
      "Tu SVG no tiene el grupo <g id=\"label_points\"> con los puntos de cada región. Revisa que lo hayas pegado completo."
    );
    return;
  }

  // Construir un diccionario nombre -> {x, y} usando los círculos de label_points
  const puntos = {};
  gLabelPoints.querySelectorAll("circle").forEach((circulo) => {
    const nombre = circulo.getAttribute("class");
    puntos[nombre] = {
      x: parseFloat(circulo.getAttribute("cx")),
      y: parseFloat(circulo.getAttribute("cy")),
    };
  });

  const contenedorEtiquetas = document.getElementById("etiquetas-container");
  const lineasSvg = document.getElementById("lineas-conectoras");
  contenedorEtiquetas.innerHTML = "";
  lineasSvg.innerHTML = "";

  // Datos de las regiones seleccionadas (solo las que existen tanto en votos como en el mapa)
  const datos = seleccionados
    .filter((nombre) => puntos[nombre] && votos[nombre] !== undefined)
    .map((nombre) => ({
      nombre,
      votos: votos[nombre],
      punto: puntos[nombre],
    }));

  const faltantes = seleccionados.filter((nombre) => !puntos[nombre] || votos[nombre] === undefined);
  if (faltantes.length > 0) {
    console.warn("No se encontraron datos o punto en el mapa para:", faltantes);
  }

  if (datos.length === 0) {
    alert("Ninguna de las regiones seleccionadas coincide con los puntos del mapa o con votos_por_region.json.");
    return;
  }

  // Total de votos seleccionados (informativo)
  const total = datos.reduce((sum, d) => sum + d.votos, 0);
  document.getElementById("subtitulo-total").textContent =
    `${datos.length} región(es) seleccionada(s) · ${total.toLocaleString("es-PE")} votos en total`;

  // Separar en columna izquierda / derecha según la posición X en el viewBox del mapa
  const viewBox = svg.viewBox.baseVal; // {x, y, width, height}
  const centroX = viewBox.x + viewBox.width / 2;

  const izquierda = datos.filter((d) => d.punto.x < centroX).sort((a, b) => a.punto.y - b.punto.y);
  const derecha = datos.filter((d) => d.punto.x >= centroX).sort((a, b) => a.punto.y - b.punto.y);

  // Ajustar la altura del wrapper para que quepan todas las tarjetas sin encimarse
  const wrapper = document.getElementById("mapa-wrapper");
  const maxItems = Math.max(izquierda.length, derecha.length, 1);
  const alturaNecesaria = Math.max(500, maxItems * 68);
  wrapper.style.height = alturaNecesaria + "px";

  // Medir posiciones DESPUÉS de fijar la altura (el mapa queda centrado dentro del wrapper)
  const wrapperRect = wrapper.getBoundingClientRect();
  const mapaRect = svg.getBoundingClientRect();

  lineasSvg.setAttribute("width", wrapperRect.width);
  lineasSvg.setAttribute("height", wrapperRect.height);
  lineasSvg.setAttribute("viewBox", `0 0 ${wrapperRect.width} ${wrapperRect.height}`);

  function puntoAPixeles(punto) {
    return {
      x: (mapaRect.left - wrapperRect.left) + (punto.x / viewBox.width) * mapaRect.width,
      y: (mapaRect.top - wrapperRect.top) + (punto.y / viewBox.height) * mapaRect.height,
    };
  }

  colocarColumna(izquierda, "izquierda", wrapperRect, contenedorEtiquetas, lineasSvg, puntoAPixeles, alturaNecesaria);
  colocarColumna(derecha, "derecha", wrapperRect, contenedorEtiquetas, lineasSvg, puntoAPixeles, alturaNecesaria);

  const canvas = document.getElementById("resultado-infografia");
  canvas.style.display = "block";
  canvas.scrollIntoView({ behavior: "smooth" });
}

function colocarColumna(lista, lado, wrapperRect, contenedorEtiquetas, lineasSvg, puntoAPixeles, alturaTotal) {
  if (lista.length === 0) return;

  const paddingV = 30;
  const alturaDisponible = alturaTotal - paddingV * 2;
  const paso = lista.length > 1 ? alturaDisponible / (lista.length - 1) : 0;

  lista.forEach((item, i) => {
    const yEtiqueta = lista.length > 1 ? paddingV + paso * i : alturaTotal / 2;

    // Crear la tarjeta con el nombre y los votos
    const box = document.createElement("div");
    box.className = `etiqueta-region etiqueta-${lado}`;
    box.style.top = `${yEtiqueta}px`;
    box.innerHTML = `
      <span>${item.nombre}</span>
      <strong>${item.votos.toLocaleString("es-PE")} votos</strong>
    `;
    contenedorEtiquetas.appendChild(box);

    // Anclar la línea al borde de la tarjeta (derecho si es columna izquierda, izquierdo si es columna derecha)
    const boxRect = box.getBoundingClientRect();
    const anclaX = lado === "izquierda" ? boxRect.right - wrapperRect.left : boxRect.left - wrapperRect.left;
    const anclaY = boxRect.top - wrapperRect.top + boxRect.height / 2;

    const puntoPx = puntoAPixeles(item.punto);

    const linea = document.createElementNS("http://www.w3.org/2000/svg", "line");
    linea.setAttribute("x1", anclaX);
    linea.setAttribute("y1", anclaY);
    linea.setAttribute("x2", puntoPx.x);
    linea.setAttribute("y2", puntoPx.y);
    linea.setAttribute("class", "linea-conectora");
    lineasSvg.appendChild(linea);

    const punto = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    punto.setAttribute("cx", puntoPx.x);
    punto.setAttribute("cy", puntoPx.y);
    punto.setAttribute("r", 4);
    punto.setAttribute("class", "punto-mapa");
    lineasSvg.appendChild(punto);
  });
}