import { PROCESS_CATALOG, flatCatalog } from './catalog.js';

const $ = (selector) => document.querySelector(selector);

const elements = {
  dbLocation: $('#dbLocation'),
  syncState: $('#syncState'),
  pendingViewButton: $('#pendingViewButton'),
  priorityViewButton: $('#priorityViewButton'),
  uploadedViewButton: $('#uploadedViewButton'),
  pendingView: $('#pendingView'),
  priorityView: $('#priorityView'),
  uploadedView: $('#uploadedView'),
  pageTitle: $('#pageTitle'),
  pageSubtitle: $('#pageSubtitle'),
  searchInput: $('#searchInput'),
  unitFilter: $('#unitFilter'),
  statusFilter: $('#statusFilter'),
  processFilter: $('#processFilter'),
  moreFiltersButton: $('#moreFiltersButton'),
  advancedFilters: $('#advancedFilters'),
  taskTableBody: $('#taskTableBody'),
  emptyState: $('#emptyState'),
  resultCount: $('#resultCount'),
  statActive: $('#statActive'),
  statSent: $('#statSent'),
  statUploaded: $('#statUploaded'),
  statOverdue: $('#statOverdue'),
  priorityMaxCount: $('#priorityMaxCount'),
  priorityHighCount: $('#priorityHighCount'),
  priorityMediumCount: $('#priorityMediumCount'),
  priorityLowCount: $('#priorityLowCount'),
  priorityBoard: $('#priorityBoard'),
  uploadedTableBody: $('#uploadedTableBody'),
  uploadedEmptyState: $('#uploadedEmptyState'),
  uploadedCount: $('#uploadedCount'),
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
  tasks: [],
  view: 'pendientes'
};

const STATUS_META = {
  pendiente: { label: 'Pendiente', className: 'status-pending' },
  realizado: { label: 'Realizado', className: 'status-realized' },
  enviado_firmar: { label: 'Enviado a firmar', className: 'status-sent' },
  subido: { label: 'Subido', className: 'status-uploaded' }
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

const PRIORITY_ORDER = ['maxima', 'alta', 'media', 'baja'];

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
  if (task.status === 'subido') return false;
  const days = getDaysUntilDue(task);
  return days !== null && days < 0;
}

function automaticPriority(task) {
  if (task.status === 'subido') return 'baja';

  const days = getDaysUntilDue(task);
  if (days === null) return 'baja';
  if (days <= 0) return 'maxima';
  if (days <= 2) return 'alta';
  if (days <= 7) return 'media';
  return 'baja';
}

function effectivePriority(task) {
  if (task.status === 'subido') return 'baja';

  const manual = PRIORITY_RANK[task.priority] ? task.priority : 'media';
  const automatic = automaticPriority(task);

  return PRIORITY_RANK[automatic] > PRIORITY_RANK[manual]
    ? automatic
    : manual;
}

function dueLabel(task) {
  if (task.status === 'subido') return 'Subido';

  const days = getDaysUntilDue(task);
  if (days === null) return 'Sin fecha';
  if (days < -1) return `Vencido hace ${Math.abs(days)} días`;
  if (days === -1) return 'Vencido ayer';
  if (days === 0) return 'Entrega hoy';
  if (days === 1) return 'Entrega mañana';
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
  const active = state.tasks.filter((task) => task.status !== 'subido');
  elements.statActive.textContent = active.length;
  elements.statSent.textContent = state.tasks.filter((task) => task.status === 'enviado_firmar').length;
  elements.statUploaded.textContent = state.tasks.filter((task) => task.status === 'subido').length;
  elements.statOverdue.textContent = state.tasks.filter(isOverdue).length;
}

function filteredTasks() {
  const search = normalize(elements.searchInput.value);
  const unit = elements.unitFilter.value;
  const status = elements.statusFilter.value;
  const processCode = elements.processFilter.value;

  return state.tasks
    .filter((task) => {
      if (task.status === 'subido') return false;
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
      const aCompleted = a.status === 'subido';
      const bCompleted = b.status === 'subido';

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
    const autoRaised = PRIORITY_RANK[effective] > PRIORITY_RANK[task.priority || 'media'];
    const overdue = isOverdue(task);

    return `
      <tr data-id="${escapeHtml(task.id)}" class="${overdue ? 'row-overdue' : ''}">
        <td>
          <div class="doc-title">${escapeHtml(task.documentName || 'Sin nombre')}</div>
          <div class="doc-meta">
            <span>${escapeHtml(task.unit || '')} · ${escapeHtml(task.processCode || '')}</span>
            ${task.processName ? `<span class="separator">·</span><span>${escapeHtml(task.processName)}</span>` : ''}
          </div>
          ${task.documentCode ? `<div class="doc-code">${escapeHtml(task.documentCode)}</div>` : ''}
        </td>
        <td>
          <select class="quick-status ${status.className}" data-id="${escapeHtml(task.id)}" aria-label="Estado de ${escapeHtml(task.documentName || 'documento')}">
            <option value="pendiente" ${task.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="realizado" ${task.status === 'realizado' ? 'selected' : ''}>Realizado</option>
            <option value="enviado_firmar" ${task.status === 'enviado_firmar' ? 'selected' : ''}>Enviado a firmar</option>
            <option value="subido" ${task.status === 'subido' ? 'selected' : ''}>Subido</option>
          </select>
        </td>
        <td>
          <div class="date-inline">
            <input class="quick-date" data-id="${escapeHtml(task.id)}" type="date" value="${escapeHtml(task.dueDate || '')}" aria-label="Fecha de entrega de ${escapeHtml(task.documentName || 'documento')}" />
            <span class="due-note ${overdue ? 'overdue-date' : ''}">${escapeHtml(dueLabel(task))}</span>
          </div>
        </td>
        <td>
          <div class="priority-inline">
            <select class="quick-priority" data-id="${escapeHtml(task.id)}" aria-label="Prioridad de ${escapeHtml(task.documentName || 'documento')}">
              <option value="maxima" ${task.priority === 'maxima' ? 'selected' : ''}>Máxima</option>
              <option value="alta" ${task.priority === 'alta' ? 'selected' : ''}>Alta</option>
              <option value="media" ${task.priority === 'media' ? 'selected' : ''}>Media</option>
              <option value="baja" ${task.priority === 'baja' ? 'selected' : ''}>Baja</option>
            </select>
            ${autoRaised ? `<span class="auto-priority-note">${effectiveMeta.label} automática</span>` : ''}
          </div>
        </td>
        <td class="actions-cell">
          <div class="row-actions">
            <button class="mini-button edit-task" type="button" data-id="${escapeHtml(task.id)}">Editar</button>
            <button class="mini-button delete delete-task" type="button" data-id="${escapeHtml(task.id)}" aria-label="Eliminar ${escapeHtml(task.documentName || 'documento')}">×</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}
function renderPriorityView() {
  const active = state.tasks.filter((task) => task.status !== 'subido').sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[effectivePriority(b)] - PRIORITY_RANK[effectivePriority(a)];
    if (priorityDiff !== 0) return priorityDiff;
    const aDays = getDaysUntilDue(a);
    const bDays = getDaysUntilDue(b);
    if (aDays === null && bDays !== null) return 1;
    if (aDays !== null && bDays === null) return -1;
    if (aDays !== null && bDays !== null && aDays !== bDays) return aDays - bDays;
    return String(a.documentName || '').localeCompare(String(b.documentName || ''), 'es');
  });

  const counts = { maxima: 0, alta: 0, media: 0, baja: 0 };
  active.forEach((task) => { counts[effectivePriority(task)] += 1; });
  elements.priorityMaxCount.textContent = counts.maxima;
  elements.priorityHighCount.textContent = counts.alta;
  elements.priorityMediumCount.textContent = counts.media;
  elements.priorityLowCount.textContent = counts.baja;

  if (!active.length) {
    elements.priorityBoard.innerHTML = '<div class="empty-state"><div class="empty-icon">✓</div><h3>No hay pendientes activos</h3><p>Todos los documentos están subidos.</p></div>';
    return;
  }

  elements.priorityBoard.innerHTML = PRIORITY_ORDER.map((priority) => {
    const tasks = active.filter((task) => effectivePriority(task) === priority);
    if (!tasks.length) return '';
    const meta = PRIORITY_META[priority];

    return `
      <section class="priority-group">
        <div class="priority-group-head">
          <span class="badge ${meta.className}">${meta.label}</span>
          <span>${tasks.length} ${tasks.length === 1 ? 'pendiente' : 'pendientes'}</span>
        </div>
        <div class="priority-list">
          ${tasks.map((task) => {
            const statusMeta = STATUS_META[task.status] || STATUS_META.pendiente;
            const overdue = isOverdue(task);
            return `
              <article class="priority-item ${overdue ? 'priority-item-overdue' : ''}">
                <div class="priority-item-main">
                  <div class="doc-title">${escapeHtml(task.documentName || 'Sin nombre')}</div>
                  <div class="priority-meta-line">
                    <span>${escapeHtml(task.unit || '')} · ${escapeHtml(task.processCode || '')}</span>
                    <span class="status-chip ${statusMeta.className}">${statusMeta.label}</span>
                  </div>
                </div>
                <div class="priority-date-block">
                  <strong class="${overdue ? 'overdue-date' : ''}">${escapeHtml(dueLabel(task))}</strong>
                  <span>${escapeHtml(formatDate(task.dueDate))}</span>
                </div>
                <button class="mini-button edit-priority-task" type="button" data-id="${escapeHtml(task.id)}">Editar</button>
              </article>`;
          }).join('')}
        </div>
      </section>`;
  }).join('');
}

function renderUploadedView() {
  const uploaded = state.tasks
    .filter((task) => task.status === 'subido')
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

  elements.uploadedCount.textContent = `${uploaded.length} ${uploaded.length === 1 ? 'documento finalizado' : 'documentos finalizados'}`;
  elements.uploadedEmptyState.classList.toggle('hidden', uploaded.length > 0);

  elements.uploadedTableBody.innerHTML = uploaded.map((task) => `
    <tr>
      <td>
        <div class="doc-title">${escapeHtml(task.documentName || 'Sin nombre')}</div>
        ${task.documentCode ? `<div class="doc-code">${escapeHtml(task.documentCode)}</div>` : ''}
      </td>
      <td>
        <div class="process-code">${escapeHtml(task.unit || '')} · ${escapeHtml(task.processCode || '')}</div>
        <div class="process-name">${escapeHtml(task.processName || '')}</div>
      </td>
      <td>
        <div class="date-inline">
          <span>${escapeHtml(formatDate(task.dueDate))}</span>
          <span class="due-note">Subido</span>
        </div>
      </td>
      <td class="actions-cell">
        <button class="mini-button edit-uploaded-task" type="button" data-id="${escapeHtml(task.id)}">Editar</button>
      </td>
    </tr>`
  ).join('');
}
function setView(view) {
  state.view = view;
  const isPending = view === 'pendientes';
  const isPriority = view === 'prioridades';
  const isUploaded = view === 'subidos';

  elements.pendingView.classList.toggle('hidden', !isPending);
  elements.priorityView.classList.toggle('hidden', !isPriority);
  elements.uploadedView.classList.toggle('hidden', !isUploaded);

  elements.pendingViewButton.classList.toggle('active', isPending);
  elements.priorityViewButton.classList.toggle('active', isPriority);
  elements.uploadedViewButton.classList.toggle('active', isUploaded);

  if (isPending) {
    elements.pageTitle.textContent = 'Pendientes';
    elements.pageSubtitle.textContent = 'Documentos activos que todavía requieren gestión.';
  } else if (isPriority) {
    elements.pageTitle.textContent = 'Prioridades';
    elements.pageSubtitle.textContent = 'Qué atender primero según prioridad y fecha de entrega.';
    renderPriorityView();
  } else {
    elements.pageTitle.textContent = 'Subidos';
    elements.pageSubtitle.textContent = 'Documentos cuyo proceso ya fue completado.';
    renderUploadedView();
  }
}

function render() {
  renderStats();
  renderTable();
  renderPriorityView();
  renderUploadedView();
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
  const tasks = state.view === 'subidos'
    ? state.tasks.filter((task) => task.status === 'subido')
    : state.view === 'prioridades'
      ? state.tasks.filter((task) => task.status !== 'subido')
      : filteredTasks();

  if (!tasks.length) {
    showToast('No hay registros para exportar.');
    return;
  }

  const headers = ['Unidad', 'Proceso', 'Nombre del proceso', 'Documento', 'Código', 'Estado', 'Prioridad efectiva', 'Prioridad manual', 'Fecha de entrega', 'Tiempo', 'Notas'];
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
  elements.pendingViewButton.addEventListener('click', () => setView('pendientes'));
  elements.priorityViewButton.addEventListener('click', () => setView('prioridades'));
  elements.uploadedViewButton.addEventListener('click', () => setView('subidos'));
  elements.moreFiltersButton.addEventListener('click', () => {
    const opening = elements.advancedFilters.classList.contains('hidden');
    elements.advancedFilters.classList.toggle('hidden', !opening);
    elements.moreFiltersButton.classList.toggle('active', opening);
  });
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
    const statusSelect = event.target.closest('.quick-status');
    const prioritySelect = event.target.closest('.quick-priority');
    const dateInput = event.target.closest('.quick-date');

    if (statusSelect) {
      quickUpdateTask(statusSelect.dataset.id, { status: statusSelect.value });
    }

    if (prioritySelect) {
      quickUpdateTask(prioritySelect.dataset.id, { priority: prioritySelect.value });
    }

    if (dateInput) {
      quickUpdateTask(dateInput.dataset.id, { dueDate: dateInput.value });
    }
  });

  elements.priorityBoard.addEventListener('click', (event) => {
    const edit = event.target.closest('.edit-priority-task');
    if (edit) openEditTask(edit.dataset.id);
  });

  elements.uploadedTableBody.addEventListener('click', (event) => {
    const edit = event.target.closest('.edit-uploaded-task');
    if (edit) openEditTask(edit.dataset.id);
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
  setView('pendientes');

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
