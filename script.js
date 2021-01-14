const version = 1;
const db = new Dexie('todo');
const options = { year: 'numeric', month: 'numeric', day: 'numeric' };

const liCode = (data) =>
    `<li class="list-group-item d-flex justify-content-between align-items-center bg-dark" data-id=${
        data.id
    }>
    <div>
    ${categories[data.category]} | ${data.content}
    </div>
    <div class="btn-toolbar d-none" role="toolbar" aria-label="Toolbar with button groups">
        <div class="btn-group" role="group" aria-label="First group">
        </div>
    </div>
</li>`;

const boardCode = (data) => `
<div class="col">
    <div class="d-flex justify-content-between" data-role="boardHeader">
        <h3>${data.name}</h3>
        <button type="button" class="btn btn-outline-secondary d-none" data-bs-toggle="modal" data-bs-target="#configurationModal" data-id=${data.id}>⚙️</button>
    </div>
    <div class="border rounded mh-2" style="border-color: ${data.color}!important" data-id="${data.id}">
        <ul class="list-group" id="_${data.id}List" data-role="boardList">
        </ul>
    </div>
</div>
`;

const categories = [];
categories['default'] = '❔';
categories['mail'] = '📧';
categories['shop'] = '🛍️';
categories['work'] = '💻';
categories['rdv'] = '📅';
categories['call'] = '📞';

addInput.addEventListener('keydown', async (event) => {
    if (event.key == 'Enter') {
        add(addInput.value);
        addInput.value = '';
        await renderBoards();
    }
});

async function init() {
    db.version(version).stores({
        elements: '++id, board, date',
        boards: '++id, name, order',
    });

    const res = await db.boards.toArray();

    if (res.length == 0) {
        await db.boards.add({
            name: 'Open',
            color: '#ffffff',
            order: 1,
        });

        await db.boards.add({
            name: 'WIP',
            color: '#ffa500',
            order: 2,
        });

        await db.boards.add({
            name: 'Close',
            color: '#ffffff',
            order: 3,
        });

        await db.elements.add({
            content: 'Website',
            date: new Date(),
            category: 'work',
            board: 1,
        });

        await db.elements.add({
            content: 'Sample',
            date: new Date(),
            category: 'work',
            board: 2,
        });
    }
}

async function add(data) {
    data =
        data.includes(':') && data.split(':')[0] in categories
            ? data.split(':', 2)
            : ['default', data];
    const current = new Date();
    await db.elements.add({
        content: data[1],
        date: current,
        category: data[0],
        board: 1,
    });
}

async function addBoard(data) {
    let res = await db.boards.count();
    await db.boards.add({
        name: data,
        color: '#' + ((Math.random() * 0xffffff) << 0).toString(16),
        order: res + 1,
    });
}

async function getBoardNameFromId(id) {
    const res = await db.boards.get(id);
    return res.name;
}

async function deleteFromId(id) {
    await db.elements.delete(id);
}

async function display() {
    document.querySelectorAll('[data-role="boardList"]').forEach((el) => {
        el.innerHTML = '';
    });

    const data = await db.elements.toArray();
    for (let i = 0; i < data.length; i++) {
        document.querySelector(
            `#_${data[i].board.toString()}List`
        ).innerHTML += liCode(data[i]);
    }

    const droppable = new Draggable.Droppable(
        document.querySelectorAll('#boardsRow'),
        {
            draggable: '.list-group-item',
            dropzone: '.border',
        }
    );

    droppable.on('droppable:stop', async (data) => {
        await updateId(
            data.data.dragEvent.originalSource.getAttribute('data-id'),
            data.data.dropzone.getAttribute('data-id')
        );
        data.data.dropzone.classList.remove('draggable-dropzone--occupied');
    });
}

function displayDate() {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    date.innerText = ' - ' + new Date().toLocaleString(undefined, options);
}

function renderCategories() {
    for (c in categories) {
        catIcons.innerHTML += categories[c] + '<br>';
        catNames.innerHTML += c + '<br>';
    }
}

async function renderBoards() {
    let res = await db.boards.orderBy('order').toArray();
    boardsRow.innerHTML = '';
    res.forEach((board) => {
        boardsRow.innerHTML += boardCode(board);
    });
    document
        .querySelectorAll('button[data-role="removeBoard"]')
        .forEach(async (el) => {
            el.addEventListener('click', async () => {
                await delBoard(parseInt(el.getAttribute('data-id')));
                renderBoards();
            });
        });
    addListenerBoards();
    display();
}

async function delBoard(id) {
    await db.boards.delete(id);
}

/* Add a Board */
addBoardForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    let value = addBoardValue.value;
    addBoardValue.value = '';
    await addBoard(value);
    await renderBoards();
});

async function updateId(id, board) {
    console.log(board);
    if (board == 'trash') {
        await deleteFromId(parseInt(id));
        await renderBoards();
        document.querySelector('[data-id="trash"]').innerHTML = '';
        console.log('delete');
    } else {
        id = parseInt(id);
        board = parseInt(board);
        let res = await db.elements.update(id, { board: board });
    }
}

async function i() {
    await init();
    await renderBoards();
    displayDate();
    renderCategories();
}

async function addListenerBoards() {
    items = document.querySelectorAll('[data-role="boardHeader"]');
    items.forEach((item) => {
        item.addEventListener('mouseover', () => {
            item.lastElementChild.classList.remove('d-none');
        });
        item.addEventListener('mouseleave', () => {
            item.lastElementChild.classList.add('d-none');
        });
    });

    document.querySelectorAll('[data-bs-toggle="modal"]').forEach((element) => {
        element.addEventListener('click', async function (event) {
            const id = parseInt(element.getAttribute('data-id'));
            document.querySelector(
                '#configurationModal h5'
            ).innerHTML = await getBoardNameFromId(id);

            const info = await db.boards.get(id);
            colorInput.value = info.color;
            colorInput.addEventListener('change', async () => {
                await db.boards.update(id, { color: colorInput.value });
                await renderBoards();
            });
            removeBoard.addEventListener('click', async () => {
                await delBoard(id);
                await renderBoards();
            });
        });
    });
}

i();
