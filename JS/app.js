// =========================================================================
// CONFIGURACIÓN DE TU BASE DE DATOS DE GOOGLE SHEETS
// REEMPLAZA ESTO CON LA URL LARGA DE TU GOOGLE APPS SCRIPT QUE TERMINA EN /exec
// =========================================================================
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbx1oGqwgg2G07TQJDlhcajiDIbpBcVzIOPD06-ke5N5mExCUt_icEQga6htfhPR8iSM/exec";

// Base de datos de productos con clases de Font Awesome
const productsDatabase = {
    tacos: [
        { name: 'Taco de Birria', price: 25, iconClass: 'fa-solid fa-hotdog' },
        { name: 'Quesabirria', price: 45, iconClass: 'fa-solid fa-cheese' },
        { name: 'Taco de Birria Dorado', price: 30, iconClass: 'fa-solid fa-circle-dot' },
        { name: 'Taco de Cabeza', price: 25, iconClass: 'fa-solid fa-utensils' },
        { name: 'Taco de Lengua', price: 30, iconClass: 'fa-solid fa-utensils' }
    ],
    bebidas: [
        { name: 'Refresco Familiar', price: 35, iconClass: 'fa-solid fa-bottle-water' },
        { name: 'Agua Fresca Grande', price: 30, iconClass: 'fa-solid fa-glass-water' },
        { name: 'Coca-Cola 600ml', price: 25, iconClass: 'fa-solid fa-wine-bottle' }
    ],
    extras: [
        { name: 'Consomé Extra', price: 20, iconClass: 'fa-solid fa-bowl-rice' }, 
        { name: 'Porción de Aguacate', price: 15, iconClass: 'fa-solid fa-seedling' },
        { name: 'Queso Extra', price: 10, iconClass: 'fa-solid fa-cheese' }
    ],
    combos: [
        { name: 'Combo 3 Tacos + Consomé', price: 90, iconClass: 'fa-solid fa-box' },
        { name: 'Combo Pareja (4 Quesabirrias + 2 Bebidas)', price: 210, iconClass: 'fa-solid fa-boxes-packing' }
    ]
};

// Estado de las mesas
let tablesState = JSON.parse(localStorage.getItem('tablesState')) || [
    { id: 1, name: 'Mesa 1', capacity: 2, status: 'DISPONIBLE', isReady: false },
    { id: 2, name: 'Mesa 2', capacity: 4, status: 'DISPONIBLE', isReady: false },
    { id: 3, name: 'Mesa 3', capacity: 2, status: 'DISPONIBLE', isReady: false },
    { id: 4, name: 'Mesa 4', capacity: 3, status: 'DISPONIBLE', isReady: false },
    { id: 5, name: 'Mesa 5', capacity: 4, status: 'DISPONIBLE', isReady: false }
];

// Arreglos históricos locales
let savedOrders = JSON.parse(localStorage.getItem('savedOrders')) || [];
let kitchenOrders = JSON.parse(localStorage.getItem('kitchenOrders')) || [];

let currentTableId = null;
let orderCart = [];

// selectores DOM
const screenTables = document.getElementById('screen-tables');
const screenOrder = document.getElementById('screen-order');
const screenHistory = document.getElementById('screen-orders-history');
const screenKitchen = document.getElementById('screen-kitchen');

const btnNavMesas = document.getElementById('btn-nav-mesas');
const btnNavPedidos = document.getElementById('btn-nav-pedidos');
const btnNavCocina = document.getElementById('btn-nav-cocina');

const tablesGridContainer = document.getElementById('tables-grid-container');
const menuItemsContainer = document.getElementById('menu-items-container');
const receiptItemsContainer = document.getElementById('receipt-items-container');
const orderTotalVal = document.getElementById('order-total-val');
const orderNotesInput = document.getElementById('order-notes-input');
const historyOrdersList = document.getElementById('history-orders-list');
const kitchenOrdersList = document.getElementById('kitchen-orders-list');
const kitchenCountBadge = document.getElementById('kitchen-count');

document.addEventListener('DOMContentLoaded', () => {
    renderTables();
    updateKitchenBadge();
    filterCategory('tacos', document.querySelector('.category-btn'));
});

// Renderizar mesas 
function renderTables() {
    tablesGridContainer.innerHTML = '';
    tablesState.forEach(table => {
        const card = document.createElement('div');
        card.classList.add('table-card');
        card.onclick = () => openTable(table.id);
        
        const readyAlertHTML = table.isReady 
            ? `<div class="table-ready-alert" title="¡Pedido listo!"><i class="fa-solid fa-bell fa-shake"></i></div>` 
            : '';

        card.innerHTML = `
            ${readyAlertHTML}
            <div class="table-icon-wrapper">
                <i class="fa-solid fa-table"></i>
            </div>
            <h3>${table.name}</h3>
            <p>${table.capacity} Personas</p>
            <span class="status-badge ${table.status.toLowerCase()}">${table.status}</span>
        `;
        tablesGridContainer.appendChild(card);
    });
}

function filterCategory(categoryKey, element) {
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    if(element) element.classList.add('active');

    menuItemsContainer.innerHTML = '';
    const products = productsDatabase[categoryKey] || [];
    
    products.forEach(prod => {
        const item = document.createElement('div');
        item.classList.add('menu-item');
        item.innerHTML = `
            <div class="menu-item-icon"><i class="${prod.iconClass}"></i></div>
            <div class="item-details">
                <h4>${prod.name}</h4>
                <p class="price">$${prod.price}</p>
            </div>
            <button class="add-item-btn" onclick="addToOrder('${prod.name}', ${prod.price})">
                <i class="fa-solid fa-plus"></i>
            </button>
        `;
        menuItemsContainer.appendChild(item);
    });
}

function openTable(tableId) {
    const table = tablesState.find(t => t.id === tableId);
    if (!table) return;
    currentTableId = tableId;
    document.getElementById('current-table-title').textContent = table.name;
    document.getElementById('current-table-cap').textContent = `${table.capacity} Personas`;
    
    if (table.isReady) {
        table.isReady = false;
        localStorage.setItem('tablesState', JSON.stringify(tablesState));
        renderTables();
    }

    clearOrder();
    setActiveScreen(screenOrder, btnNavMesas);
}

function showTablesScreen() { setActiveScreen(screenTables, btnNavMesas); currentTableId = null; }
function showOrdersHistoryScreen() { setActiveScreen(screenHistory, btnNavPedidos); renderOrdersHistory(); }
function showKitchenScreen() { setActiveScreen(screenKitchen, btnNavCocina); renderKitchenOrders(); }

function setActiveScreen(screenElement, navButtonElement) {
    [screenTables, screenOrder, screenHistory, screenKitchen].forEach(s => s.classList.remove('active'));
    [btnNavMesas, btnNavPedidos, btnNavCocina].forEach(b => b.classList.remove('active'));
    screenElement.classList.add('active');
    if(navButtonElement) navButtonElement.classList.add('active');
}

// Control del carrito
function addToOrder(name, price) {
    const existingItem = orderCart.find(item => item.name === name);
    if (existingItem) { existingItem.qty += 1; } else { orderCart.push({ name, price, qty: 1 }); }
    renderOrder();
}
function updateQty(name, amount) {
    const item = orderCart.find(item => item.name === name);
    if (!item) return;
    item.qty += amount;
    if (item.qty <= 0) { deleteItem(name); } else { renderOrder(); }
}
function deleteItem(name) { orderCart = orderCart.filter(item => item.name !== name); renderOrder(); }
function clearOrder() { orderCart = []; orderNotesInput.value = ''; renderOrder(); }

function renderOrder() {
    receiptItemsContainer.innerHTML = '';
    let total = 0;
    orderCart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        const row = document.createElement('div');
        row.classList.add('receipt-row');
        row.innerHTML = `
            <div class="receipt-item-info"><h4>${item.name}</h4></div>
            <div class="receipt-qty-controls">
                <button class="qty-btn" onclick="updateQty('${item.name}', -1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="updateQty('${item.name}', 1)">+</button>
            </div>
            <span class="receipt-item-price">$${itemTotal}</span>
            <button class="delete-item-btn" onclick="deleteItem('${item.name}')"><i class="fa-solid fa-trash-can"></i></button>
        `;
        receiptItemsContainer.appendChild(row);
    });
    orderTotalVal.textContent = `$${total}`;
}

// Envío a cocina y respaldo en la nube (Google Sheets)
function sendToKitchen() {
    if (orderCart.length === 0) { alert("Agrega productos antes de enviar."); return; }

    const table = tablesState.find(t => t.id === currentTableId);
    const totalAmount = orderCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // Captura de fecha y hora del sistema
    const now = new Date();
    const dateString = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const orderId = Date.now();

    const orderData = {
        id: orderId,
        tableName: table ? table.name : 'Barra',
        date: dateString, // Nueva propiedad: Fecha
        time: timeString,
        items: [...orderCart],
        notes: orderNotesInput.value.trim(),
        total: totalAmount,
        status: 'PREPARANDO'
    };

    // 1. Guardar de forma local en la memoria de la App
    savedOrders.unshift(orderData);
    localStorage.setItem('savedOrders', JSON.stringify(savedOrders));

    kitchenOrders.push(orderData);
    localStorage.setItem('kitchenOrders', JSON.stringify(kitchenOrders));

    if (table) {
        table.status = 'OCUPADO';
        localStorage.setItem('tablesState', JSON.stringify(tablesState));
        renderTables();
    }

    updateKitchenBadge();

    // 2. Mandar a la Base de Datos en la nube (Google Sheets) de fondo
    if (GOOGLE_SHEETS_URL && GOOGLE_SHEETS_URL !== "AQUÍ_PEGA_TU_URL_DE_APPS_SCRIPT_QUE_TERMINA_EN_EXEC") {
        fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        })
        .then(() => {
            console.log("Orden guardada con éxito en Google Sheets.");
        })
        .catch(err => {
            console.error("Error al conectar con la hoja de cálculo: ", err);
        });
    }

    alert(`¡Comanda enviada a Cocina y guardada en Google Sheets!`);
    showTablesScreen();
}

function renderKitchenOrders() {
    kitchenOrdersList.innerHTML = '';
    if(kitchenOrders.length === 0) {
        kitchenOrdersList.innerHTML = `<p style="color:var(--text-light); text-align:center; grid-column:1/-1; margin-top:40px; font-size: 20px;">No hay órdenes pendientes en cocina.</p>`;
        return;
    }

    kitchenOrders.forEach(order => {
        const card = document.createElement('div');
        card.classList.add('kitchen-card');
        const itemsHTML = order.items.map(i => `<div class="kitchen-item-row"><strong>${i.qty}x</strong> <span>${i.name}</span></div>`).join('');

        card.innerHTML = `
            <div>
                <div class="kitchen-card-header">
                    <span>${order.tableName}</span>
                    <span class="time"><i class="fa-regular fa-clock"></i> ${order.time}</span>
                </div>
                <div class="kitchen-card-body">
                    ${itemsHTML}
                    ${order.notes ? `<div class="kitchen-notes-block"><i class="fa-solid fa-triangle-exclamation"></i> <div><strong>OBSERVACIÓN:</strong><br>${order.notes}</div></div>` : ''}
                </div>
            </div>
            <button class="kitchen-ready-btn" onclick="markOrderAsReady(${order.id})">
                <i class="fa-solid fa-circle-check"></i> ¡ORDEN LISTA! ENVIAR A MESERO
            </button>
        `;
        kitchenOrdersList.appendChild(card);
    });
}

function markOrderAsReady(orderId) {
    const historyOrder = savedOrders.find(o => o.id === orderId);
    if(historyOrder) {
        historyOrder.status = 'LISTO';
        localStorage.setItem('savedOrders', JSON.stringify(savedOrders));
        
        const targetTable = tablesState.find(t => t.name === historyOrder.tableName);
        if (targetTable) {
            targetTable.isReady = true;
            localStorage.setItem('tablesState', JSON.stringify(tablesState));
            renderTables();
        }
    }

    kitchenOrders = kitchenOrders.filter(o => o.id !== orderId);
    localStorage.setItem('kitchenOrders', JSON.stringify(kitchenOrders));

    updateKitchenBadge();
    renderKitchenOrders();
}

function updateKitchenBadge() {
    kitchenCountBadge.textContent = kitchenOrders.length;
    kitchenCountBadge.style.display = kitchenOrders.length === 0 ? 'none' : 'inline-block';
}

// Modificación en el Apps Script para procesar la nueva columna de fecha
function liberarMesaActual() {
    if(!currentTableId) return;
    const table = tablesState.find(t => t.id === currentTableId);
    if(table) {
        table.status = 'DISPONIBLE';
        table.isReady = false;
        localStorage.setItem('tablesState', JSON.stringify(tablesState));
        renderTables();
        alert(`La ${table.name} fue liberada.`);
        showTablesScreen();
    }
}

function renderOrdersHistory() {
    historyOrdersList.innerHTML = '';
    if (savedOrders.length === 0) {
        historyOrdersList.innerHTML = `<p style="text-align:center; color: #A0A5A9; margin-top:20px;">No hay registros.</p>`;
        return;
    }

    savedOrders.forEach(order => {
        const itemsSummary = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');
        const isReady = order.status === 'LISTO';

        const card = document.createElement('div');
        card.classList.add('history-card');
        card.innerHTML = `
            <div class="history-card-header">
                <span>Comanda: ${order.tableName}</span>
                <span class="order-status-tag ${order.status.toLowerCase()}">
                    <i class="${isReady ? 'fa-solid fa-circle-check' : 'fa-solid fa-fire-burner'}"></i> 
                    ${isReady ? '¡LISTO PARA SERVIR!' : 'EN PREPARACIÓN'}
                </span>
            </div>
            <div class="history-card-body">
                <strong>Detalle:</strong> ${itemsSummary} <br>
                ${order.notes ? `<strong>Observación:</strong> <em>"${order.notes}"</em>` : ''}
            </div>
            <div class="history-card-footer">
                <span>Total:</span>
                <span class="history-total">$${order.total}</span>
            </div>
        `;
        historyOrdersList.appendChild(card);
    });
}