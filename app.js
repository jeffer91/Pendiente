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
  maxima: { label: 'Máxima', className: 'priority-max' },
  alta: { label: 'Alta', className: 'priority-high' },
  media: { label: 'Media', className: 'priority-medium' },
  baja: { label: 'Baja', className: 'priority-low' }
};

const PRIORITY_RANK = {
  baja: 1,
  media: 2,
  alta: 3,
  maxima: 4
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

function getDaysUntilDue(task) {
  if (!task.dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${task.dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;

  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function isOverdue(task) {
  if (task.status === 'completado') return false;
  const days = getDaysUntilDue(task);
  return days !== null && days < 0;
}

function automaticPriority(task) {
  if (task.status === 'completado') return 'baja';

  const days = getDaysUntilDue(task);
  if (days === null) return 'baja';
  if (days <= 0) return 'maxima';
  if (days <= 2) return 'alta';
  if (days <= 7) return 'media';
  return 'baja';
}

function effectivePriority(task) {
  const manual = PRIORITY_RANK[task.priority] ? task.priority : 'media';
  const automatic = automaticPriority(task);

  return PRIORITY_RANK[automatic] > PRIORITY_RANK[manual]
    ? automatic
    : manual;
}

function dueLabel(task) {
  if (task.status === 'completado') return 'Completado';

  const days = getDaysUntilDue(task);
  if (days === null) return 'Sin fecha';
  if (days < -1) return `Vencido hace ${Math.abs(days)} días`;
  if (days === -1) return 'Vencido ayer';
  if (days === 0) return 'Sale hoy';
  if (days === 1) return 'Sale mañana';
  return `Faltan ${days} días`;
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

  return state.tasks
    .filter((task) => {
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
    })
    .sort((a, b) => {
      const aCompleted = a.status === 'completado';
      const bCompleted = b.status === 'completado';

      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

      const priorityDiff =
        PRIORITY_RANK[effectivePriority(b)] - PRIORITY_RANK[effectivePriority(a)];
      if (priorityDiff !== 0) return priorityDiff;

      const aDays = getDaysUntilDue(a);
      const bDays = getDaysUntilDue(b);

      if (aDays === null && bDays !== null) return 1;
      if (aDays !== null && bDays === null) return -1;
      if (aDays !== null && bDays !== null && aDays !== bDays) return aDays - bDays;

      return String(a.documentName || '').localeCompare(String(b.documentName || ''), 'es');
    });
}

function renderTable() {
  const tasks = filteredTasks();
  elements.resultCount.textContent = `${tasks.length} ${tasks.length === 1 ? 'registro' : 'registros'}`;
  elements.emptyState.classList.toggle('hidden', tasks.length > 0);

  elements.taskTableBody.innerHTML = tasks.map((task) => {
    const status = STATUS_META[task.status] || STATUS_META.pendiente;
    const effective = effectivePriority(task);
    const effectiveMeta = PRIORITY_META[effective] || PRIORITY_META.media;
    const manual = PRIORITY_META[task.priority] || PRIORITY_META.media;
    const autoRaised = PRIORITY_RANK[effective] > PRIORITY_RANK[task.priority || 'media'];
    const overdue = isOverdue(task);
    const timeText = dueLabel(task);

    return `
      <tr data-id="${escapeHtml(task.id)}" class="${overdue ? 'row-overdue' : ''}">
        <td>
          <div class="doc-title">${escapeHtml(task.documentName || 'Sin nombre')}</div>
          <div class="doc-code">${escapeHtml(task.documentCode || 'Sin código')}</div>
        </td>
        <td>
          <div class="process-code">${escapeHtml(task.unit || '')} · ${escapeHtml(task.processCode || '')}</div>
          <div class="process-name">${escapeHtml(task.processName || '')}</div>
        </td>
        <td><span class="badge ${status.className}">${status.label}</span></td>
        <td>
          <div class="priority-inline">
            <select class="quick-priority" data-id="${escapeHtml(task.id)}" aria-label="Prioridad de ${escapeHtml(task.documentName || 'documento')}">
              <option value="alta" ${task.priority === 'alta' ? 'selected' : ''}>Alta</option>
              <option value="media" ${task.priority === 'media' ? 'selected' : ''}>Media</option>
              <option value="baja" ${task.priority === 'baja' ? 'selected' : ''}>Baja</option>
            </select>
            <span class="badge ${effectiveMeta.className}" title="Prioridad efectiva">${effectiveMeta.label}</span>
          </div>
          ${autoRaised ? `<div class="auto-priority-note">Automática · manual: ${manual.label}</div>` : ''}
        </td>
        <td>
          <div class="date-inline">
            <input class="quick-date" data-id="${escapeHtml(task.id)}" type="date" value="${escapeHtml(task.dueDate || '')}" aria-label="Fecha de salida de ${escapeHtml(task.documentName || 'documento')}" />
            <span class="due-note ${overdue ? 'overdue-date' : ''}">${escapeHtml(timeText)}</span>
          </div>
        </td>
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

async function quickUpdateTask(taskId, changes) {
  const task = state.tasks.find((item) => String(item.id) === String(taskId));
  if (!task) return;

  const payload = {
    unit: task.unit,
    processCode: task.processCode,
    processName: task.processName,
    documentName: task.documentName,
    documentCode: task.documentCode,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    notes: task.notes,
    ...changes
  };

  try {
    await window.pendingAPI.update(taskId, payload);
    await reloadTasks();
    showToast('Pendiente actualizado.');
  } catch (error) {
    console.error(error);
    showToast('No se pudo actualizar el registro.');
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

  const headers = ['Unidad', 'Proceso', 'Nombre del proceso', 'Documento', 'Código', 'Estado', 'Prioridad efectiva', 'Prioridad manual', 'Fecha de salida', 'Tiempo', 'Notas'];
  const rows = tasks.map((task) => [
    task.unit,
    task.processCode,
    task.processName,
    task.documentName,
    task.documentCode,
    STATUS_META[task.status]?.label || task.status,
    PRIORITY_META[effectivePriority(task)]?.label || effectivePriority(task),
    PRIORITY_META[task.priority]?.label || task.priority,
    task.dueDate,
    dueLabel(task),
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

  elements.taskTableBody.addEventListener('change', (event) => {
    const prioritySelect = event.target.closest('.quick-priority');
    const dateInput = event.target.closest('.quick-date');

    if (prioritySelect) {
      quickUpdateTask(prioritySelect.dataset.id, { priority: prioritySelect.value });
    }

    if (dateInput) {
      quickUpdateTask(dateInput.dataset.id, { dueDate: dateInput.value });
    }
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
