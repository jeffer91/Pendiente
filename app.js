import { PROCESS_CATALOG, flatCatalog } from './catalog.js';

const $ = (selector) => document.querySelector(selector);

const elements = {
  dbLocation: $('#dbLocation'),
  syncState: $('#syncState'),
  searchInput: $('#searchInput'),
  unitFilter: $('#unitFilter'),
  statusFilter: $('#statusFilter'),
  processFilter: $('#processFilter'),
  taskTableBody: $('#taskTableBody'),
  emptyState: $('#emptyState'),
  resultCount: $('#resultCount'),
  statTotal: $('#statTotal'),
  statPending: $('#statPending'),
  statProgress: $('#statProgress'),
  statDone: $('#statDone'),
  statOverdue: $('#statOverdue'),
  newTaskButton: $('#newTaskButton'),
  exportButton: $('#exportButton'),
  taskDialog: $('#taskDialog'),
  taskForm: $('#taskForm'),
  dialogTitle: $('#dialogTitle'),
  taskId: $('#taskId'),
  taskUnit: $('#taskUnit'),
  taskProcess: $('#taskProcess'),
  taskDocumentSelect: $('#taskDocumentSelect'),
  taskDocumentName: $('#taskDocumentName'),
  taskDocumentCode: $('#taskDocumentCode'),
  taskStatus: $('#taskStatus'),
  taskPriority: $('#taskPriority'),
  taskDueDate: $('#taskDueDate'),
  taskNotes: $('#taskNotes'),
  taskMessage: $('#taskMessage'),
  closeDialogButton: $('#closeDialogButton'),
  cancelTaskButton: $('#cancelTaskButton'),
  saveTaskButton: $('#saveTaskButton'),
  toast: $('#toast')
};

const state = {
  tasks: []
};

const STATUS_META = {
  pendiente: { label: 'Pendiente', className: 'pending' },
  en_proceso: { label: 'En proceso', className: 'progress' },
  bloqueado: { label: 'Bloqueado', className: 'blocked' },
  completado: { label: 'Completado', className: 'done' }
};

const PRIORITY_META = {
  alta: { label: 'Alta', className: 'priority-high' },
  media: { label: 'Media', className: 'priority-medium' },
  baja: { label: 'Baja', className: 'priority-low' }
};

function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.add('hidden'), 2800);
}

function setBusy(button, busy, busyText = 'Procesando…') {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function isOverdue(task) {
  if (!task.dueDate || task.status === 'completado') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.dueDate}T00:00:00`);
  return due < today;
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function uniqueProcesses(unit = '') {
  return PROCESS_CATALOG.filter((process) => !unit || process.unit === unit);
}

function populateProcessFilter() {
  const current = elements.processFilter.value;
  const unit = elements.unitFilter.value;
  const processes = uniqueProcesses(unit);

  elements.processFilter.innerHTML =
    '<option value="">Todos los procesos</option>' +
    processes.map((process) =>
      `<option value="${escapeHtml(process.processCode)}">${escapeHtml(process.processCode)} · ${escapeHtml(process.processName)}</option>`
    ).join('');

  if (processes.some((process) => process.processCode === current)) {
    elements.processFilter.value = current;
  }
}

function populateTaskProcesses() {
  const unit = elements.taskUnit.value;
  const current = elements.taskProcess.value;
  const processes = uniqueProcesses(unit);

  elements.taskProcess.innerHTML = processes.map((process) =>
    `<option value="${escapeHtml(process.processCode)}">${escapeHtml(process.processCode)} · ${escapeHtml(process.processName)}</option>`
  ).join('');

  if (processes.some((process) => process.processCode === current)) {
    elements.taskProcess.value = current;
  }

  populateTaskDocuments();
}

function populateTaskDocuments() {
  const process = PROCESS_CATALOG.find((item) => item.processCode === elements.taskProcess.value);
  const options = process?.documents || [];

  elements.taskDocumentSelect.innerHTML =
    '<option value="">Personalizado / escribir manualmente</option>' +
    options.map(([name, code], index) =>
      `<option value="${index}">${escapeHtml(name)}${code ? ` · ${escapeHtml(code)}` : ''}</option>`
    ).join('');
}

function applyDocumentPreset() {
  const process = PROCESS_CATALOG.find((item) => item.processCode === elements.taskProcess.value);
  if (!process || elements.taskDocumentSelect.value === '') return;

  const [name, code] = process.documents[Number(elements.taskDocumentSelect.value)] || ['', ''];
  elements.taskDocumentName.value = name;
  elements.taskDocumentCode.value = code;
}

function renderStats() {
  elements.statTotal.textContent = state.tasks.length;
  elements.statPending.textContent = state.tasks.filter((task) => task.status === 'pendiente').length;
  elements.statProgress.textContent = state.tasks.filter((task) => task.status === 'en_proceso').length;
  elements.statDone.textContent = state.tasks.filter((task) => task.status === 'completado').length;
  elements.statOverdue.textContent = state.tasks.filter(isOverdue).length;
}

function filteredTasks() {
  const search = normalize(elements.searchInput.value);
  const unit = elements.unitFilter.value;
  const status = elements.statusFilter.value;
  const processCode = elements.processFilter.value;

  return state.tasks.filter((task) => {
    if (unit && task.unit !== unit) return false;
    if (status && task.status !== status) return false;
    if (processCode && task.processCode !== processCode) return false;
    if (!search) return true;

    return normalize([
      task.documentName,
      task.documentCode,
      task.processCode,
      task.processName,
      task.notes,
      task.unit
    ].join(' ')).includes(search);
  });
}

function renderTable() {
  const tasks = filteredTasks();
  elements.resultCount.textContent = `${tasks.length} ${tasks.length === 1 ? 'registro' : 'registros'}`;
  elements.emptyState.classList.toggle('hidden', tasks.length > 0);

  elements.taskTableBody.innerHTML = tasks.map((task) => {
    const status = STATUS_META[task.status] || STATUS_META.pendiente;
    const priority = PRIORITY_META[task.priority] || PRIORITY_META.media;
    const overdue = isOverdue(task);

    return `
      <tr data-id="${escapeHtml(task.id)}">
        <td>
          <div class="doc-title">${escapeHtml(task.documentName || 'Sin nombre')}</div>
          <div class="doc-code">${escapeHtml(task.documentCode || 'Sin código')}</div>
        </td>
        <td>
          <div class="process-code">${escapeHtml(task.unit || '')} · ${escapeHtml(task.processCode || '')}</div>
          <div class="process-name">${escapeHtml(task.processName || '')}</div>
        </td>
        <td><span class="badge ${status.className}">${status.label}</span></td>
        <td><span class="badge ${priority.className}">${priority.label}</span></td>
        <td class="${overdue ? 'overdue-date' : ''}">${escapeHtml(formatDate(task.dueDate))}${overdue ? ' · Vencido' : ''}</td>
        <td class="actions-cell">
          <div class="row-actions">
            <button class="mini-button edit-task" type="button" data-id="${escapeHtml(task.id)}">Editar</button>
            <button class="mini-button delete delete-task" type="button" data-id="${escapeHtml(task.id)}">Eliminar</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function render() {
  renderStats();
  renderTable();
}

async function reloadTasks() {
  state.tasks = await window.pendingAPI.list();
  render();
}

function resetTaskForm() {
  elements.taskForm.reset();
  elements.taskId.value = '';
  elements.taskUnit.value = 'UTET';
  elements.taskStatus.value = 'pendiente';
  elements.taskPriority.value = 'media';
  elements.taskMessage.textContent = '';
  elements.dialogTitle.textContent = 'Nuevo pendiente';
  populateTaskProcesses();
}

function openNewTask() {
  resetTaskForm();
  elements.taskDialog.showModal();
}

function openEditTask(taskId) {
  const task = state.tasks.find((item) => String(item.id) === String(taskId));
  if (!task) return;

  resetTaskForm();
  elements.dialogTitle.textContent = 'Editar pendiente';
  elements.taskId.value = task.id;
  elements.taskUnit.value = task.unit || 'UTET';
  populateTaskProcesses();
  elements.taskProcess.value = task.processCode || elements.taskProcess.value;
  populateTaskDocuments();
  elements.taskDocumentName.value = task.documentName || '';
  elements.taskDocumentCode.value = task.documentCode || '';
  elements.taskStatus.value = task.status || 'pendiente';
  elements.taskPriority.value = task.priority || 'media';
  elements.taskDueDate.value = task.dueDate || '';
  elements.taskNotes.value = task.notes || '';
  elements.taskDialog.showModal();
}

function closeTaskDialog() {
  if (elements.taskDialog.open) elements.taskDialog.close();
}

function getProcessMeta(processCode) {
  return PROCESS_CATALOG.find((item) => item.processCode === processCode);
}

async function saveTask(event) {
  event.preventDefault();

  const process = getProcessMeta(elements.taskProcess.value);
  const payload = {
    unit: elements.taskUnit.value,
    processCode: elements.taskProcess.value,
    processName: process?.processName || '',
    documentName: elements.taskDocumentName.value.trim(),
    documentCode: elements.taskDocumentCode.value.trim(),
    status: elements.taskStatus.value,
    priority: elements.taskPriority.value,
    dueDate: elements.taskDueDate.value,
    notes: elements.taskNotes.value.trim()
  };

  if (!payload.documentName) {
    elements.taskMessage.textContent = 'Escribe el nombre del documento o pendiente.';
    return;
  }

  setBusy(elements.saveTaskButton, true, 'Guardando…');
  elements.taskMessage.textContent = '';

  try {
    if (elements.taskId.value) {
      await window.pendingAPI.update(elements.taskId.value, payload);
      showToast('Pendiente actualizado.');
    } else {
      await window.pendingAPI.create(payload);
      showToast('Pendiente creado.');
    }

    await reloadTasks();
    closeTaskDialog();
  } catch (error) {
    console.error(error);
    elements.taskMessage.textContent = 'No se pudo guardar en la base local.';
  } finally {
    setBusy(elements.saveTaskButton, false);
  }
}

async function removeTask(taskId) {
  const task = state.tasks.find((item) => String(item.id) === String(taskId));
  if (!task) return;

  if (!window.confirm(`¿Eliminar “${task.documentName}”?`)) return;

  try {
    await window.pendingAPI.remove(taskId);
    await reloadTasks();
    showToast('Pendiente eliminado.');
  } catch (error) {
    console.error(error);
    showToast('No se pudo eliminar el registro.');
  }
}

function exportCsv() {
  const tasks = filteredTasks();

  if (!tasks.length) {
    showToast('No hay registros para exportar.');
    return;
  }

  const headers = ['Unidad', 'Proceso', 'Nombre del proceso', 'Documento', 'Código', 'Estado', 'Prioridad', 'Fecha límite', 'Notas'];
  const rows = tasks.map((task) => [
    task.unit,
    task.processCode,
    task.processName,
    task.documentName,
    task.documentCode,
    STATUS_META[task.status]?.label || task.status,
    PRIORITY_META[task.priority]?.label || task.priority,
    task.dueDate,
    task.notes
  ]);

  const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = '\ufeff' + [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(';'))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `pendientes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function setupEvents() {
  elements.newTaskButton.addEventListener('click', openNewTask);
  elements.exportButton.addEventListener('click', exportCsv);
  elements.closeDialogButton.addEventListener('click', closeTaskDialog);
  elements.cancelTaskButton.addEventListener('click', closeTaskDialog);
  elements.taskForm.addEventListener('submit', saveTask);

  elements.searchInput.addEventListener('input', renderTable);
  elements.statusFilter.addEventListener('change', renderTable);
  elements.processFilter.addEventListener('change', renderTable);

  elements.unitFilter.addEventListener('change', () => {
    populateProcessFilter();
    renderTable();
  });

  elements.taskUnit.addEventListener('change', populateTaskProcesses);
  elements.taskProcess.addEventListener('change', populateTaskDocuments);
  elements.taskDocumentSelect.addEventListener('change', applyDocumentPreset);

  elements.taskTableBody.addEventListener('click', (event) => {
    const edit = event.target.closest('.edit-task');
    const remove = event.target.closest('.delete-task');

    if (edit) openEditTask(edit.dataset.id);
    if (remove) removeTask(remove.dataset.id);
  });
}

async function init() {
  if (!window.pendingAPI) {
    elements.syncState.textContent = 'Error de base local';
    elements.syncState.classList.add('error');
    return;
  }

  populateProcessFilter();
  populateTaskProcesses();
  setupEvents();

  try {
    const info = await window.pendingAPI.getInfo();
    elements.dbLocation.title = info.path;
    elements.dbLocation.textContent = 'SQLite local';

    const seedResult = await window.pendingAPI.seed(flatCatalog);
    await reloadTasks();

    elements.syncState.textContent = 'Base local';
    elements.syncState.classList.add('online');

    if (seedResult.inserted > 0) {
      showToast(`${seedResult.inserted} pendientes iniciales cargados.`);
    }
  } catch (error) {
    console.error(error);
    elements.syncState.textContent = 'Error de base local';
    elements.syncState.classList.add('error');
    showToast('No se pudo abrir la base de datos local.');
  }
}

init();
