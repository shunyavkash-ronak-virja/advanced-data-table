(() => {
    'use strict';
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const KEY = 'amethyst-users-readable-v2';
    const departments = [...$('#add-user-department').options].filter(o => o.value).map(o => ({ value: o.value, label: o.textContent }));
    const roles = ['admin', 'member', 'viewer', 'editor'];
    const statuses = ['active', 'pending', 'suspended', 'invited'];
    const names = ['Sofia Bennett', 'Daniel Kim', 'Maya Patel', 'Oliver Johnson', 'Ava Williams', 'Noah Brown', 'Emma Davis', 'Liam Wilson', 'Isabella Moore', 'Ethan Taylor', 'Amelia Anderson', 'Lucas Thomas', 'Mia Jackson', 'James White', 'Charlotte Harris', 'Benjamin Martin', 'Harper Thompson', 'Henry Garcia', 'Ella Martinez', 'Alexander Robinson', 'Grace Clark', 'Michael Rodriguez', 'Chloe Lewis', 'William Lee', 'Zoe Walker', 'Elijah Hall', 'Aria Allen', 'Logan Young', 'Lily King', 'Jack Wright', 'Nora Scott', 'Samuel Green', 'Emily Baker', 'David Adams', 'Ruby Nelson', 'Jacob Carter', 'Hannah Mitchell', 'Leo Perez', 'Sarah Roberts', 'Nathan Turner', 'Aiden Phillips', 'Olivia Campbell', 'Ryan Parker', 'Layla Evans', 'Aaron Edwards', 'Eva Collins', 'Owen Stewart', 'Alice Morris', 'Isaac Rogers', 'Leah Reed'];
    const label = (v, options) => options.find(o => o.value === v)?.label || (v ? v.charAt(0).toUpperCase() + v.slice(1) : '');
    const uid = () => window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const normalizeEmail = v => v.trim().toLowerCase();
    function validDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
            return false;
        const parts = value.split('-');
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    }
    const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    function dateLabel(value) {
        if (!validDate(value))
            return '—';
        const parts = value.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[Number(parts[1]) - 1] + ' ' + parts[2] + ', ' + parts[0];
    }
    // Creates 120 sample users only when there is no saved data.
    function samples() {
        return Array.from({ length: 120 }, (_, i) => {
            const name = names[i % names.length];
            const date = new Date(Date.UTC(2024, 0, 1 + (i * 11) % 980)).toISOString().slice(0, 10);
            return { id: `demo-${i + 1}`, name, email: `${name.toLowerCase().replace(/\s+/g, '.')}${i >= names.length ? i : ''}@amethyst.io`, department: departments[i % departments.length].value, role: roles[i % roles.length], status: statuses[i % statuses.length], createdDate: date };
        });
    }
    function validUser(u) {
        return u && typeof u.id === 'string' && typeof u.name === 'string' && typeof u.email === 'string' && departments.some(d => d.value === u.department) && roles.includes(u.role) && statuses.includes(u.status) && validDate(u.createdDate);
    }
    // API integration point: replace localStorage.getItem with GET /users.
    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw === null)
                return samples();
            const data = JSON.parse(raw);
            if (!Array.isArray(data) || !data.every(validUser) || new Set(data.map(u => u.id)).size !== data.length || new Set(data.map(u => normalizeEmail(u.email))).size !== data.length)
                throw Error('Invalid saved users');
            return data;
        }
        catch (e) {
            console.warn('Invalid saved demo data; reset to samples.', e);
            return samples();
        }
    }
    let users = load();
    const state = { search: '', filters: {}, sort: 'name-asc', page: 1, pageSize: 10, selected: new Set(), editId: null, detailId: null, pending: null, busy: false, retry: null };
    const body = $('.datatable-body');
    const rowTemplate = document.createElement('template');
    rowTemplate.innerHTML = `<tr><td><input class="datatable-checkbox user-select-checkbox" type="checkbox"></td><td><div class="author-details-wrapper"><div class="flex-shrink-0 bg-purple author-profile"></div><div class="author-info"><h3 class="h4 author-name"></h3><span class="author-email"></span></div></div></td><td><div class="badge bg-purple department-badge"></div></td><td><div class="badge bg-blue role-badge"></div></td><td><div class="badge status-badge bg-green"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="flex-shrink-0 status-badge-icon"><circle cx="12" cy="12" r="5"/></svg><span class="status-text"></span></div></td><td><div class="created-date"></div></td><td><div class="row-actions-wrapper"><button type="button" class="row-actions-btn action-btn" aria-label="User actions" aria-expanded="false"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="flex-shrink-0 ellipsis-icon"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></button><div class="row-actions-dropdown"><div class="scrollbar-vertical row-actions-stack"><button type="button" class="row-actions" data-row-action="edit">Edit user</button><button type="button" class="row-actions" data-row-action="view">View activity</button><button type="button" class="row-actions" data-row-action="toggle">Deactivate user</button><button type="button" class="row-actions delete-action" data-row-action="delete">Delete user</button></div></div></div></td></tr>`;
    // API integration point: replace localStorage.setItem with your save endpoint.
    const persist = next => { localStorage.setItem(KEY, JSON.stringify(next)); users = next; };
    const getUser = id => users.find(u => u.id === id);
    const hasFilters = () => Object.values(state.filters).some(Boolean);
    function results() {
        const q = state.search.toLocaleLowerCase();
        const f = state.filters;
        const filtered = users.filter(u => (!q || [u.name, u.email, label(u.department, departments)].some(x => x.toLocaleLowerCase().includes(q))) && (!f.department || u.department === f.department) && (!f.role || u.role === f.role) && (!f.status || u.status === f.status) && (!f.from || (validDate(u.createdDate) && u.createdDate >= f.from)) && (!f.to || (validDate(u.createdDate) && u.createdDate <= f.to)));
        const [field, direction] = state.sort.split('-');
        return filtered.sort((a, b) => { const av = field === 'department' ? label(a.department, departments) : a.name; const bv = field === 'department' ? label(b.department, departments) : b.name; const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' }); return (direction === 'desc' ? -cmp : cmp) || a.id.localeCompare(b.id); });
    }
    const visiblePage = rows => rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    function setBadge(el, text, color) {
        // Keep original badge-small and other layout classes. Only replace background colors.
        const colors = ['bg-purple', 'bg-blue', 'bg-green', 'bg-beige', 'bg-red', 'bg-grey'];
        el.classList.remove(...colors);
        el.classList.add(color);
        el.textContent = text;
    }
    function renderRow(user) {
        const tr = rowTemplate.content.firstElementChild.cloneNode(true);
        tr.dataset.userId = user.id;
        const checkbox = $('.user-select-checkbox', tr);
        checkbox.checked = state.selected.has(user.id);
        checkbox.setAttribute('aria-label', `Select ${user.name}`);
        tr.classList.toggle('selected', checkbox.checked);
        $('.author-name', tr).textContent = user.name;
        $('.author-email', tr).textContent = user.email;
        const avatar = $('.author-profile', tr);
        avatar.textContent = user.name.trim().split(/\s+/).slice(0, 2).map(s => s[0] || '').join('');
        const avatarColors = ['bg-purple', 'bg-blue', 'bg-green', 'bg-beige', 'bg-red', 'bg-grey'];
        let colorNumber = 0;
        for (let i = 0; i < user.name.length; i++)
            colorNumber += user.name.charCodeAt(i);
        avatar.className = 'flex-shrink-0 author-profile ' + avatarColors[colorNumber % avatarColors.length];
        setBadge($('.department-badge', tr), label(user.department, departments), ['bg-purple', 'bg-blue', 'bg-green', 'bg-beige', 'bg-red', 'bg-grey'][departments.findIndex(d => d.value === user.department) % 6]);
        setBadge($('.role-badge', tr), label(user.role, []), user.role === 'admin' ? 'bg-blue' : user.role === 'editor' ? 'bg-purple' : user.role === 'viewer' ? 'bg-beige' : 'bg-grey');
        const statusBadge = $('.status-badge', tr);
        statusBadge.className = `badge status-badge ${user.status === 'active' ? 'bg-green' : user.status === 'suspended' ? 'bg-red' : user.status === 'pending' ? 'bg-beige' : 'bg-purple'}`;
        $('.status-text', tr).textContent = label(user.status, []);
        $('.created-date', tr).textContent = dateLabel(user.createdDate);
        $('[data-row-action="toggle"]', tr).textContent = user.status === 'active' ? 'Deactivate user' : 'Activate user';
        return tr;
    }
    function pageWindow(total) {
        const set = new Set([1, total, state.page - 1, state.page, state.page + 1, 2]);
        const pages = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
        const result = [];
        pages.forEach((p, i) => {
            if (i && p - pages[i - 1] > 1)
                result.push('...'); result.push(p);
        });
        return result;
    }
    // Keep the original pagination SVG icon from index.html.
    function makeArrow(direction, disabled) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pagination-btn pagination-arrow';
        button.disabled = disabled;
        if (disabled)
            button.classList.add('disabled');
        button.setAttribute('aria-label', direction === 'previous' ? 'Previous page' : 'Next page');
        const iconTemplate = document.getElementById('pagination-arrow-template');
        const icon = iconTemplate.content.firstElementChild.cloneNode(true);
        if (direction === 'previous')
            icon.style.transform = 'rotate(180deg)';
        button.appendChild(icon);
        button.addEventListener('click', function () {
            state.page += direction === 'previous' ? -1 : 1;
            render();
        });
        return button;
    }
    function makePageButton(page) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pagination-btn page-num';
        if (page === state.page)
            button.classList.add('active');
        button.textContent = page;
        button.addEventListener('click', function () {
            state.page = page;
            render();
        });
        return button;
    }
    function renderPagination(count) {
        const pages = Math.max(1, Math.ceil(count / state.pageSize));
        const start = count === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
        const end = Math.min(state.page * state.pageSize, count);
        // Only update the two spans in your pagination-info HTML.
        $('.perpage-user-list').textContent = start + ' – ' + end;
        $('.total-user-value').textContent = count;
        const host = $('.pagination');
        host.replaceChildren();
        host.appendChild(makeArrow('previous', state.page === 1));
        const visiblePages = pageWindow(pages);
        visiblePages.forEach(function (page) {
            if (page === '...') {
                const dots = document.createElement('span');
                dots.className = 'pagination-btn page-dots';
                dots.textContent = '...';
                host.appendChild(dots);
            }
            else {
                host.appendChild(makePageButton(page));
            }
        });
        host.appendChild(makeArrow('next', state.page === pages));
    }
    function updateSelection() {
        // Remove deleted users from selection.
        for (const id of [...state.selected]) {
            if (!getUser(id)) state.selected.delete(id);
        }
        const checkboxes = $$('.user-select-checkbox', body);
        let checkedCount = 0;
        checkboxes.forEach(function (checkbox) {
            if (checkbox.checked) checkedCount++;
        });
        const checkAll = $('#check-all');
        checkAll.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
        checkAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
        const count = state.selected.size;
        const bulkToolbar = $('.bulk-actions-wrapper');
        bulkToolbar.classList.toggle('show', count > 0);
        bulkToolbar.hidden = count === 0;
        $('.bulk-actions-counter').textContent = count + (count === 1 ? ' user selected' : ' users selected');
    }
    function render() {
        const rows = results();
        const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
        state.page = Math.min(state.page, pages);
        const empty = rows.length === 0;
        $('.datatable').hidden = empty;
        $$('.empty-states').forEach(el => el.style.display = 'none');
        if (empty) {
            const kind = users.length === 0 ? 'empty-dataset' : state.search ? 'search-results' : 'filters-results';
            const el = $(`.${kind}`);
            el.style.display = 'flex';
            if (kind === 'search-results')
                $('.empty-state-title', el).textContent = `No results for '${state.search}'`;
            if (kind === 'empty-dataset')
                $('.empty-state-title', el).textContent = 'No users have been created';
            if (kind === 'filters-results')
                $('.empty-state-title', el).textContent = 'No users match these filters';
        }
        body.replaceChildren(...visiblePage(rows).map(renderRow));
        // Keep the pagination summary visible, including the 0-user state.
        $('.pagination-wrapper').hidden = false;
        renderPagination(rows.length);
        updateSelection();
        if (state.detailId && getUser(state.detailId))
            renderDetails(getUser(state.detailId));
    }
    function syncSelect(select) {
        if (window.jQuery && window.jQuery.fn.niceSelect) {
            window.jQuery(select).niceSelect('update');
        }
    }
    function formFields(prefix) { return { name: $(`#${prefix}-name`), email: $(`#${prefix}-email`), department: $(`#${prefix}-department`), role: $(`#${prefix}-role`), status: $(`#${prefix}-status`), createdDate: $(`#${prefix}-registration-date`) }; }
    function clearFieldError(input) {
        input.removeAttribute('aria-invalid');
        input.classList.remove('input-error-field');
        const stack = input.closest('.input-stack');
        if (stack) {
            const message = stack.querySelector('.input-error');
            if (message) message.remove();
        }
        if (input.tagName === 'SELECT') {
            const nice = input.nextElementSibling;
            if (nice && nice.classList.contains('nice-select')) {
                nice.removeAttribute('aria-invalid');
                nice.classList.remove('input-error-field');
            }
        }
    }
    function clearErrors(form) {
        $$('input, select, textarea', form).forEach(clearFieldError);
    }
    function fieldError(input, message) {
        clearFieldError(input);
        input.setAttribute('aria-invalid', 'true');
        input.classList.add('input-error-field');
        if (input.tagName === 'SELECT') {
            const nice = input.nextElementSibling;
            if (nice && nice.classList.contains('nice-select')) {
                nice.setAttribute('aria-invalid', 'true');
                nice.classList.add('input-error-field');
            }
        }
        const stack = input.closest('.input-stack');
        if (stack) {
            const text = document.createElement('span');
            text.className = 'input-error';
            text.textContent = message;
            stack.appendChild(text);
        }
    }
    function validate(fields, excludeId) {
        const data = Object.fromEntries(Object.entries(fields).map(([k, el]) => [k, el.value.trim()]));
        data.email = normalizeEmail(data.email);
        const errors = {};
        if (!data.name || data.name.length < 2)
            errors.name = 'Enter a name of at least 2 characters.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
            errors.email = 'Enter a valid email address.';
        else if (users.some(u => u.id !== excludeId && normalizeEmail(u.email) === data.email))
            errors.email = 'This email address is already in use.';
        if (!departments.some(d => d.value === data.department))
            errors.department = 'Select a valid department.';
        if (!roles.includes(data.role))
            errors.role = 'Select a valid role.';
        if (!statuses.includes(data.status))
            errors.status = 'Select a valid status.';
        if (!validDate(data.createdDate)) {
            errors.createdDate = 'Please select a valid registration date.';
        }
        Object.entries(errors).forEach(([key, msg]) => fieldError(fields[key], msg));
        return Object.keys(errors).length ? null : data;
    }
    function openModal(id) {
        const modal = document.getElementById(id);
        if (!modal)
            return;
        modal.classList.add('active');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.dataset.previousFocus = '';
        modal._previousFocus = document.activeElement;
        document.body.classList.add('body-hidden');
        requestAnimationFrame(() => { const focus = $('input:not([type=hidden]),button', modal); focus?.focus(); });
    }
    function syncBodyScroll() {
        const open = document.querySelector('.modal.active, .sidebar.active');
        document.body.classList.toggle('body-hidden', Boolean(open));
    }
    function closeModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove('active');
        syncBodyScroll();
        if (modal._previousFocus && modal._previousFocus.isConnected) {
            modal._previousFocus.focus();
        }
    }
    function closeAll() {
        $$('.modal.active, .sidebar.active').forEach(function (modal) {
            modal.classList.remove('active');
        });
        syncBodyScroll();
    }
    function closeDropdowns() { $$('.toolbar-dropdown-block.show,.row-actions-dropdown.show').forEach(el => el.classList.remove('show')); }
    function showSuccess(title, message) { closeAll(); $('.success-modal-title').textContent = title; $('.success-modal-description').textContent = message; openModal('success-modal'); }
    function showError(title, message, retry = null) { closeAll(); state.retry = retry; $('.error-modal-title').textContent = title; $('.error-modal-description').textContent = message; openModal('error-modal'); }
    async function operation(button, fn) {
        if (state.busy)
            return;
        state.busy = true;
        const original = button.innerHTML;
        button.disabled = true;
        const spinner = document.createElement('span');
        spinner.className = 'btn-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        button.prepend(spinner);
        try {
            await new Promise(resolve => setTimeout(resolve, 350));
            if (window.USER_TABLE_SIMULATE_ERROR)
                throw Error('Simulated operation failure');
            await fn();
        }
        catch (e) {
            showError('Operation failed', e.message || 'Changes could not be saved.', () => operation(button, fn));
        }
        finally {
            button.innerHTML = original;
            button.disabled = false;
            state.busy = false;
        }
    }
    function openForm(mode, id = null) {
        state.editId = mode === 'edit' ? id : null;
        const prefix = mode === 'edit' ? 'edit-user' : 'add-user';
        const fields = formFields(prefix);
        const form = fields.name.closest('form');
        form.reset();
        clearErrors(form);
        const u = id ? getUser(id) : null;
        if (u)
            Object.entries(fields).forEach(([k, el]) => { el.value = u[k]; });
        // New user fields start empty, including the required registration date.
        Object.values(fields).filter(el => el.tagName === 'SELECT').forEach(syncSelect);
        openModal(prefix);
    }
    function submitForm(event, mode) {
        event.preventDefault();
        const form = event.currentTarget;
        clearErrors(form);
        const fields = formFields(mode === 'edit' ? 'edit-user' : 'add-user');
        const data = validate(fields, mode === 'edit' ? state.editId : null);
        if (!data)
            return;
        const button = $('[type="submit"]', form);
        operation(button, () => {
            if (mode === 'edit') {
                if (!getUser(state.editId))
                    throw Error('This user no longer exists.');
                persist(users.map(u => u.id === state.editId ? { ...u, ...data } : u));
            }
            else
                persist([...users, { id: uid(), ...data }]);
            state.page = 1;
            render();
            form.reset();
            showSuccess(mode === 'edit' ? 'User Updated' : 'User Created', mode === 'edit' ? 'User details updated successfully' : 'User created successfully');
        });
    }
    const ACTIONS = {
        activate: { verb: 'activate', past: 'activated', title: 'Activate Selected Users', success: 'Users Activated' },
        deactivate: { verb: 'deactivate', past: 'deactivated', title: 'Deactivate Selected Users', success: 'Users Deactivated' },
        delete: { verb: 'delete', past: 'deleted', title: 'Delete Selected Users', success: 'Users Deleted' }
    };
    function actionIds(ids, action) { return ids.filter(id => { const u = getUser(id); return u && (action === 'delete' || (action === 'activate' ? u.status !== 'active' : u.status !== 'suspended')); }); }
    function beginAction(action, ids, individual = false) {
        const effective = actionIds(ids, action);
        if (!effective.length) {
            showError('No eligible users', 'Select at least one user who can be ' + ACTIONS[action].past + '.');
            return;
        }
        state.pending = { action, ids: effective, individual };
        const cfg = ACTIONS[action];
        const count = effective.length;
        const first = getUser(effective[0]);
        const initialId = individual ? (action === 'delete' ? 'row-action-delete' : 'row-action-deactivate') : (action === 'activate' ? 'activate' : action === 'deactivate' ? 'bulk-action-deactivate' : 'delete');
        const modal = $(`#${initialId}`);
        $('.actions-modal-title', modal).textContent = individual ? `${action === 'delete' ? 'Delete' : action === 'activate' ? 'Activate' : 'Deactivate'} user?` : cfg.title;
        $('.actions-modal-description', modal).textContent = individual ? `Are you sure you want to ${cfg.verb} ${first.name}?${action === 'delete' ? ' This action cannot be undone.' : ''}` : `Are you sure you want to ${cfg.verb} ${count} selected user${count === 1 ? '' : 's'}?${action === 'delete' ? ' This action cannot be undone.' : ''}`;
        $$('.actions-user-value', modal).forEach(el => el.textContent = count);
        const caption = $('.actions-caption-value', modal);
        if (caption)
            caption.textContent = `${count} user${count === 1 ? '' : 's'}`;
        const btn = $('.actions-modal-btns button:last-child', modal);
        btn.textContent = `${cfg.verb[0].toUpperCase() + cfg.verb.slice(1)} ${individual ? 'user' : 'users'}`;
        closeAll();
        openModal(initialId);
    }
    function confirmAction(button) {
        const pending = state.pending;
        if (!pending)
            return;
        operation(button, () => {
            const ids = actionIds(pending.ids, pending.action);
            if (!ids.length)
                throw Error('No users remain eligible for this action.');
            const set = new Set(ids);
            const action = pending.action;
            if (action === 'delete')
                persist(users.filter(u => !set.has(u.id)));
            else
                persist(users.map(u => set.has(u.id) ? { ...u, status: action === 'activate' ? 'active' : 'suspended' } : u));
            ids.forEach(id => state.selected.delete(id));
            if (state.detailId && !getUser(state.detailId))
                state.detailId = null;
            state.pending = null;
            render();
            const cfg = ACTIONS[action];
            const n = ids.length;
            showSuccess(pending.individual ? `User ${cfg.past[0].toUpperCase() + cfg.past.slice(1)}` : cfg.success, `${n} user${n === 1 ? ' has' : 's have'} been successfully ${cfg.past}.`);
        });
    }
    function renderDetails(u) {
        const root = $('#row-action-view-activity');
        const sidebarAvatar = $('.sidebar-author-profile', root);
        sidebarAvatar.textContent = u.name.split(/\s+/).slice(0, 2).map(x => x[0]).join('');
        let avatarNumber = 0;
        for (let i = 0; i < u.name.length; i++)
            avatarNumber += u.name.charCodeAt(i);
        sidebarAvatar.classList.remove('bg-purple', 'bg-blue', 'bg-green', 'bg-beige', 'bg-red', 'bg-grey');
        sidebarAvatar.classList.add(['bg-purple', 'bg-blue', 'bg-green', 'bg-beige', 'bg-red', 'bg-grey'][avatarNumber % 6]);
        $('.sidebar-user-name', root).textContent = u.name;
        $('.sidebar-user-email', root).textContent = u.email;
        const badges = $$('.user-status-wrapper .badge', root);
        const deptIndex = departments.findIndex(item => item.value === u.department);
        const deptColor = ['bg-purple', 'bg-blue', 'bg-green', 'bg-beige', 'bg-red', 'bg-grey'][Math.max(0, deptIndex) % 6];
        const roleColor = u.role === 'admin' ? 'bg-blue' : u.role === 'editor' ? 'bg-purple' : u.role === 'viewer' ? 'bg-beige' : 'bg-grey';
        const statusColor = u.status === 'active' ? 'bg-green' : u.status === 'suspended' ? 'bg-red' : u.status === 'pending' ? 'bg-beige' : 'bg-purple';
        setBadge(badges[0], label(u.department, departments), deptColor);
        setBadge(badges[1], label(u.role, []), roleColor);
        setBadge(badges[2], label(u.status, []), statusColor);
        // Keep the sidebar's original activity markup and classes intact.
        const activityList = $('.recent-activity-list', root);
        const items = $$('.recent-activity-item', activityList);
        if (items.length) {
            const lastItem = items[items.length - 1];
            const caption = $('.activity-caption', lastItem);
            if (caption) caption.textContent = dateLabel(u.createdDate);
        }
    }
    function resetFilters() {
        const form = $('.filters-dropdown form');
        form.reset();
        $$('select', form).forEach(el => { el.value = ''; syncSelect(el); });
        state.filters = {};
        state.page = 1;
        clearErrors(form);
        closeDropdowns();
        render();
    }
    function applyFilters(e) {
        e.preventDefault();
        const form = e.currentTarget;
        clearErrors(form);
        const from = $('#filters-date-from').value, to = $('#filters-date-to').value;
        if (from && !validDate(from))
            return fieldError($('#filters-date-from'), 'Invalid start date.');
        if (to && !validDate(to))
            return fieldError($('#filters-date-to'), 'Invalid end date.');
        if (from && to && from > to)
            return fieldError($('#filters-date-to'), 'End date must be on or after start date.');
        state.filters = { department: $('#filters-department').value, role: $('#filters-role').value, status: $('#filters-status').value, from, to };
        state.page = 1;
        closeDropdowns();
        render();
    }
    function renderSkeleton() {
        body.replaceChildren(...Array.from({ length: 5 }, () => {
            const tr = document.createElement('tr'); for (let i = 0; i < 7; i++) {
                const td = document.createElement('td');
                const line = document.createElement('div');
                line.className = 'skeleton-line';
                td.append(line);
                tr.append(td);
            } return tr;
        }));
    }
    function init() {
        // The original HTML places bulk modals inside the toolbar.
        // Move only the modal elements (not their icons or contents) outside
        // the hidden toolbar so they can open independently.
        $$('.bulk-actions-wrapper > .bulk-actions > .modal, .bulk-actions-wrapper .modal').forEach(function (modal) {
            document.body.appendChild(modal);
        });
        $$('.user-form, .filters-dropdown form').forEach(form => form.noValidate = true);
        if (window.jQuery && window.jQuery.fn.niceSelect) {
            window.jQuery('select').niceSelect();
        }
        $('.datatable').hidden = false;
        renderSkeleton();
        setTimeout(render, 180);
        $('#searchbar').addEventListener('input', e => { state.search = e.target.value.trim(); state.page = 1; render(); });
        state.pageSize = Number($('#page-size').value) || 10;
        $('#page-size').addEventListener('change', e => { state.pageSize = Number(e.target.value); state.page = 1; render(); });
        $('.filters-dropdown form').addEventListener('submit', applyFilters);
        $('.filters-reset').addEventListener('click', resetFilters);
        $('.clear-filters').addEventListener('click', resetFilters);
        $$('.sorting-option').forEach((btn, i) => btn.addEventListener('click', () => { state.sort = ['name-asc', 'name-desc', 'department-asc', 'department-desc'][i]; $$('.sorting-option').forEach(b => b.classList.toggle('active', b === btn)); closeDropdowns(); render(); }));
        $('#check-all').setAttribute('aria-label', 'Select all users on current page');
        $('#check-all').addEventListener('change', function (event) {
            const currentUsers = visiblePage(results());
            const isChecked = event.target.checked;
            currentUsers.forEach(function (user) {
                if (isChecked) {
                    state.selected.add(user.id);
                }
                else {
                    state.selected.delete(user.id);
                }
            });
            render();
        });
        body.addEventListener('change', function (event) {
            const checkbox = event.target;
            if (!checkbox.matches('.user-select-checkbox')) return;
            const row = checkbox.closest('tr');
            const id = row.dataset.userId;
            if (checkbox.checked) state.selected.add(id);
            else state.selected.delete(id);
            row.classList.toggle('selected', checkbox.checked);
            updateSelection();
        });
        body.addEventListener('click', e => {
            const toggle = e.target.closest('.row-actions-btn');
            if (toggle) {
                e.stopPropagation();
                const dropdown = $('.row-actions-dropdown', toggle.parentElement);
                const was = dropdown.classList.contains('show');
                closeDropdowns();
                dropdown.classList.toggle('show', !was);
                toggle.setAttribute('aria-expanded', String(!was));
                return;
            }
            const action = e.target.closest('[data-row-action]');
            if (!action)
                return;
            const id = action.closest('tr').dataset.userId;
            const user = getUser(id);
            if (!user)
                return;
            closeDropdowns();
            switch (action.dataset.rowAction) {
                case 'edit':
                    openForm('edit', id);
                    break;
                case 'view':
                    state.detailId = id;
                    renderDetails(user);
                    openModal('row-action-view-activity');
                    break;
                case 'toggle':
                    beginAction(user.status === 'active' ? 'deactivate' : 'activate', [id], true);
                    break;
                case 'delete':
                    beginAction('delete', [id], true);
                    break;
            }
        });
        $('#add-user .user-form').addEventListener('submit', e => submitForm(e, 'add'));
        $('#edit-user .user-form').addEventListener('submit', e => submitForm(e, 'edit'));
        $$('.user-form, .filters-dropdown form').forEach(function (form) {
            function removeFieldError(event) {
                const input = event.target;
                if (input.matches('input, select, textarea')) clearFieldError(input);
            }
            form.addEventListener('input', removeFieldError);
            form.addEventListener('change', removeFieldError);
        });
        document.addEventListener('click', e => {
            const close = e.target.closest('.modal-close,.sidebar-close,.filters-close');
            if (close) {
                if (state.busy)
                    return;
                const modal = close.closest('.modal,.sidebar');
                if (modal) {
                    closeModal(modal.id);
                    if (modal.querySelector('.confirmation-dialog, .deactivate-dialog, .delete-dialog')) state.pending = null;
                }
                else
                    closeDropdowns();
                return;
            }
            const modalTrigger = e.target.closest('[data-modal]');
            if (modalTrigger) {
                const id = modalTrigger.dataset.modal;
                if (id === 'add-user') {
                    openForm('add');
                    return;
                }
                if (['activate', 'bulk-action-deactivate', 'delete'].includes(id)) {
                    beginAction(id === 'bulk-action-deactivate' ? 'deactivate' : id, [...state.selected]);
                    return;
                }
                openModal(id);
                return;
            }
            const toolbar = e.target.closest('.toolbar-action-stack > .action-btn');
            if (toolbar) {
                e.stopPropagation();
                const target = $(`[data-dropdown-content="${toolbar.dataset.dropdown}"]`);
                const was = target.classList.contains('show');
                closeDropdowns();
                target.classList.toggle('show', !was);
                return;
            }
            if (e.target.matches('.modal.active,.sidebar.active')) {
                if (state.busy)
                    return;
                closeModal(e.target.id);
                return;
            }
            const confirmation = e.target.closest('.actions-modal-btns button:last-child');
            if (confirmation && confirmation.closest('#activate,#bulk-action-deactivate,#delete,#row-action-deactivate,#row-action-delete')) {
                confirmAction(confirmation);
                return;
            }
            if (e.target.closest('.success-modal-btn')) {
                closeModal('success-modal');
                return;
            }
            if (e.target.closest('#error-modal .actions-modal-btns button:last-child')) {
                const retry = state.retry;
                closeModal('error-modal');
                retry?.();
                return;
            }
            if (!e.target.closest('.toolbar-action-stack,.row-actions-wrapper'))
                closeDropdowns();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                const active = $$('.modal.active,.sidebar.active').at(-1);
                if (active && !state.busy) {
                    closeModal(active.id);
                    return;
                }
                closeDropdowns();
            }
            if (e.key === 'Tab') {
                const modal = $$('.modal.active,.sidebar.active').at(-1);
                if (!modal)
                    return;
                const focusable = $$('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]', modal).filter(el => el.getClientRects().length);
                if (!focusable.length)
                    return;
                const first = focusable[0], last = focusable.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
                else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
        window.resetUserTableDemo = () => {
            if (!confirm('Reset all locally saved demo users?'))
                return; persist(samples()); state.selected.clear(); state.filters = {}; state.search = ''; state.page = 1; $('#searchbar').value = ''; resetFilters(); render();
        };
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init, { once: true });
    else
        init();
})();
