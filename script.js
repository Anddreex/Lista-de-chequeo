let currentUser = null;
let userData = {};

// Funciones de navegación
function mostrarApp() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
}

function mostrarLogin() {
  document.getElementById("login-section").style.display = "block";
  document.getElementById("app-section").style.display = "none";
}

// Funciones de almacenamiento (ahora usa la API)
async function saveUserData() {
  try {
    const response = await fetch(`/api/userdata/${currentUser}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      throw new Error('Error al guardar datos');
    }
  } catch (error) {
    console.error('Error guardando datos:', error);
    alert('Error al guardar los datos');
  }
}

async function loadUserData() {
  try {
    const response = await fetch(`/api/userdata/${currentUser}`);
    if (!response.ok) {
      throw new Error('Error al cargar datos');
    }
    userData = await response.json();
  } catch (error) {
    console.error('Error cargando datos:', error);
    userData = { sections: [] };
  }
}

// Inicialización al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const logoutBtn = document.getElementById("logout-btn");

  // Por ahora siempre mostrar login (ya no hay persistencia de sesión)
  mostrarLogin();

  // LOGIN
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (result.success) {
        currentUser = username;
        await loadUserData();
        mostrarApp();
        initChecklist();
        // Limpiar formulario
        document.getElementById("login-username").value = "";
        document.getElementById("login-password").value = "";
      } else {
        alert(result.error || "Usuario o contraseña incorrectos");
      }
    } catch (error) {
      console.error('Error en login:', error);
      alert('Error de conexión');
    }
  });

  // REGISTRO
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value.trim();

    if (username === "" || password === "") {
      alert("Por favor completa todos los campos");
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (result.success) {
        alert("Usuario registrado con éxito, ahora inicia sesión");
        // Limpiar formulario
        document.getElementById("register-username").value = "";
        document.getElementById("register-password").value = "";
      } else {
        alert(result.error || "Error al registrar usuario");
      }
    } catch (error) {
      console.error('Error en registro:', error);
      alert('Error de conexión');
    }
  });

  // LOGOUT
  logoutBtn.addEventListener("click", () => {
    currentUser = null;
    userData = {};
    mostrarLogin();
  });
});

// =====================
// CHECKLIST (sin cambios en la lógica)
// =====================
function initChecklist() {
  const addSectionInput = document.getElementById("new-section-input");
  const addSectionBtn = document.getElementById("add-section-btn");
  const sectionsContainer = document.getElementById("sections-container");

  // Limpiar contenedor
  sectionsContainer.innerHTML = "";

  // Cargar secciones existentes
  userData.sections.forEach((sectionData, index) => {
    createSectionElement(sectionData, index);
  });

  // Añadir nueva sección
  addSectionBtn.addEventListener("click", addNewSection);
  addSectionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addNewSection();
    }
  });

  function addNewSection() {
    const sectionName = addSectionInput.value.trim();
    if (sectionName === "") return;

    const newSection = {
      name: sectionName,
      tasks: []
    };

    userData.sections.push(newSection);
    saveUserData(); // Ahora es async pero no necesitamos esperar
    
    createSectionElement(newSection, userData.sections.length - 1);
    addSectionInput.value = "";
    updateGlobalProgress();
  }

  updateGlobalProgress();
}

function createSectionElement(sectionData, sectionIndex) {
  const sectionsContainer = document.getElementById("sections-container");
  
  const section = document.createElement("div");
  section.classList.add("section");
  section.dataset.index = sectionIndex;
  
  section.innerHTML = `
    <div class="section-header">
      <h2>${sectionData.name}</h2>
      <div class="acciones">
        <button class="editar-seccion">✏️</button>
        <button class="eliminar-seccion">🗑️</button>
      </div>
    </div>
    <ul class="task-list"></ul>
    <div class="progress-bar-container"><div class="progress-bar"></div></div>
    <div class="porcentaje">0%</div>
    <div class="add-task">
      <input type="text" placeholder="Nueva tarea...">
      <button>Añadir</button>
    </div>
  `;

  sectionsContainer.appendChild(section);

  // Cargar tareas existentes
  const taskList = section.querySelector(".task-list");
  sectionData.tasks.forEach((taskData, taskIndex) => {
    createTaskElement(taskData, taskIndex, taskList, sectionIndex);
  });

  attachSectionEvents(section, sectionIndex);
  updateSectionProgress(section, sectionIndex);
}

function attachSectionEvents(section, sectionIndex) {
  const addTaskInput = section.querySelector(".add-task input");
  const addTaskBtn = section.querySelector(".add-task button");
  const taskList = section.querySelector(".task-list");

  // Añadir tarea
  const addTask = () => {
    const taskName = addTaskInput.value.trim();
    if (taskName === "") return;

    const newTask = {
      name: taskName,
      completed: false,
      date: ""
    };

    userData.sections[sectionIndex].tasks.push(newTask);
    saveUserData();

    createTaskElement(newTask, userData.sections[sectionIndex].tasks.length - 1, taskList, sectionIndex);
    addTaskInput.value = "";
    updateSectionProgress(section, sectionIndex);
  };

  addTaskBtn.addEventListener("click", addTask);
  addTaskInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addTask();
    }
  });

  // Editar sección
  section.querySelector(".editar-seccion").addEventListener("click", () => {
    const newName = prompt("Nuevo nombre de la sección:", userData.sections[sectionIndex].name);
    if (newName && newName.trim() !== "") {
      userData.sections[sectionIndex].name = newName.trim();
      saveUserData();
      section.querySelector("h2").textContent = newName.trim();
    }
  });

  // Eliminar sección
  section.querySelector(".eliminar-seccion").addEventListener("click", () => {
    if (confirm("¿Eliminar esta sección y todas sus tareas?")) {
      userData.sections.splice(sectionIndex, 1);
      saveUserData();
      section.remove();
      // Recargar para actualizar índices
      initChecklist();
    }
  });
}

function createTaskElement(taskData, taskIndex, taskList, sectionIndex) {
  const li = document.createElement("li");
  li.dataset.taskIndex = taskIndex;
  
  li.innerHTML = `
    <label><input type="checkbox" ${taskData.completed ? 'checked' : ''}> ${taskData.name}</label>
    <input type="date" class="fecha" value="${taskData.date}" ${taskData.completed ? '' : 'disabled'}>
    <div class="acciones">
      <button class="editar">✏️</button>
      <button class="eliminar">🗑️</button>
    </div>
  `;
  
  taskList.appendChild(li);
  attachTaskEvents(li, sectionIndex, taskIndex);
}

function attachTaskEvents(li, sectionIndex, taskIndex) {
  const checkbox = li.querySelector("input[type='checkbox']");
  const dateInput = li.querySelector(".fecha");
  const editBtn = li.querySelector(".editar");
  const deleteBtn = li.querySelector(".eliminar");

  // Cambio de estado del checkbox
  checkbox.addEventListener("change", () => {
    userData.sections[sectionIndex].tasks[taskIndex].completed = checkbox.checked;
    
    if (checkbox.checked) {
      dateInput.disabled = false;
      if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split("T")[0];
      }
    } else {
      dateInput.disabled = true;
      dateInput.value = "";
    }
    
    userData.sections[sectionIndex].tasks[taskIndex].date = dateInput.value;
    saveUserData();
    
    const section = li.closest(".section");
    updateSectionProgress(section, sectionIndex);
  });

  // Cambio de fecha
  dateInput.addEventListener("change", () => {
    userData.sections[sectionIndex].tasks[taskIndex].date = dateInput.value;
    saveUserData();
  });

  // Editar tarea
  editBtn.addEventListener("click", () => {
    const newText = prompt("Editar tarea:", userData.sections[sectionIndex].tasks[taskIndex].name);
    if (newText && newText.trim() !== "") {
      userData.sections[sectionIndex].tasks[taskIndex].name = newText.trim();
      saveUserData();
      li.querySelector("label").innerHTML = `<input type="checkbox" ${userData.sections[sectionIndex].tasks[taskIndex].completed ? 'checked' : ''}> ${newText.trim()}`;
      attachTaskEvents(li, sectionIndex, taskIndex);
    }
  });

  // Eliminar tarea
  deleteBtn.addEventListener("click", () => {
    if (confirm("¿Eliminar esta tarea?")) {
      userData.sections[sectionIndex].tasks.splice(taskIndex, 1);
      saveUserData();
      li.remove();
      
      const section = li.closest(".section");
      updateSectionProgress(section, sectionIndex);
      
      // Recargar sección para actualizar índices
      initChecklist();
    }
  });
}

function updateSectionProgress(section, sectionIndex) {
  const tasks = userData.sections[sectionIndex].tasks;
  const completed = tasks.filter(t => t.completed).length;
  const percentValue = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const progressBar = section.querySelector(".progress-bar");
  const percent = section.querySelector(".porcentaje");
  
  progressBar.style.width = percentValue + "%";
  percent.textContent = percentValue + "%";
  
  updateGlobalProgress();
}

function updateGlobalProgress() {
  let totalTasks = 0;
  let completedTasks = 0;
  
  userData.sections.forEach(section => {
    totalTasks += section.tasks.length;
    completedTasks += section.tasks.filter(t => t.completed).length;
  });
  
  const percentValue = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const globalBar = document.getElementById("global-bar");
  const globalPercent = document.getElementById("global-percent");
  
  if (globalBar && globalPercent) {
    globalBar.style.width = percentValue + "%";
    globalPercent.textContent = percentValue + "%";
  }
}