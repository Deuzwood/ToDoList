const version = 1 ;

const liCode = (id,data) => `<li class="list-group-item d-flex justify-content-between align-items-center">
${ data.checked ? '<s>' : '' } ${categories[data.category]} | ${data.content} ${ data.checked ? '</s>' : '' }
<div class="btn-toolbar d-none" role="toolbar" aria-label="Toolbar with button groups">
    <div class="btn-group" role="group" aria-label="First group">
        <button type="button" class="btn btn-success btn-sm" data-action="btnAction" data-id="${id}" data-role="check">🗸</button>
        <input type="date" class="form-control d-none" id="datePicker-${id}">
        <button type="button" class="btn btn-warning btn-sm" data-action="btnAction" data-id="${id}" data-role="prog">📅</button>
        <button type="button" class="btn btn-danger btn-sm" data-action="btnAction" data-id="${id}" data-role="delete">🗑️</button>
    </div>
</div>
</li>` ;

const categories = []
categories["default"] = "❔"
categories["mail"] = "📧"
categories["shop"] = "🛍️"
categories["work"] = "💻"
categories["rdv"] = "📅"
categories["call"] = "📞"

addInput.addEventListener("keydown", event => {
    if(event.key == "Enter"){
        add(addInput.value)
        addInput.value = ""
        updatePage()
    }
})

async function init() {
    let db = await idb.openDB('todo', version , { upgrade(db) {
        let obj = db.createObjectStore('elements', { autoIncrement: true })
        obj.createIndex("date","date", { unique: false })
    }})
    db.close()

    updatePage()
}

init()


async function add(data) {
    let db = await idb.openDB('todo', version , { upgrade(db) {
        db.createObjectStore('elements', { autoIncrement: true })
    }})
    data = data.includes(':') && data.split(':')[0] in categories ? data.split(':',2) : ["default",data]
    await db.add('elements', { content: data[1] , date: current , category : data[0] , checked : false })

    db.close()
}

async function checkItemFromId(id) {
    let db = await idb.openDB('todo', version )

    let res = await db.get('elements', id)
    await db.put('elements', { content: res.content , date: res.date , category : res.category , checked : !res.checked }, id)

    db.close()
}

async function changeDate(id,value) {
    let db = await idb.openDB('todo', version )

    let res = await db.get('elements', id)
    await db.put('elements', { content: res.content , date: new Date(value) , category : res.category , checked : res.checked }, id)

    db.close()
}


async function getAllData() {
    try {
        let db = await idb.openDB('todo', 1)

    let tx = db.transaction('elements', 'readonly')
    let store = tx.objectStore('elements')

    // add, clear, count, delete, get, getAll, getAllKeys, getKey, put
    let allSavedItems = await store.getAll()
    let allSaveKeys = await store.getAllKeys()
    
    db.close()
    return [allSavedItems,allSaveKeys]
    } catch (error) {
        return []
    }
}

async function getData(id) {
    try {
        let db = await idb.openDB('todo', 1)

    let tx = db.transaction('elements', 'readonly')
    let store = tx.objectStore('elements')

    // add, clear, count, delete, get, getAll, getAllKeys, getKey, put
    let SavedItems = await store.get(id)
    
    db.close()
    return SavedItems
    } catch (error) {
        return null
    }
}

async function getAllDataForDays(day){
    let lower = new Date(day)
    lower.setHours(0,0,0,0)
    let upper = new Date(day)
    upper.setHours(24,0,0,0)

    let db = await idb.openDB('todo', 1)

    let cursor = await db.transaction("elements").store.index("date").openKeyCursor(IDBKeyRange.bound(lower,upper));

    let allSavedItems = []
    let allSaveKeys = []


    while (cursor) {
        allSaveKeys.push(cursor.primaryKey)
        cursor = await cursor.continue();
    }

    allSaveKeys.forEach( async element => {
        allSavedItems.push(await getData(element))
    })
    return [allSavedItems,allSaveKeys]


}

async function getCountForDays(day){
    let lower = new Date(day)
    lower.setHours(0,0,0,0)
    let upper = new Date(day)
    upper.setHours(24,0,0,0)

    let db = await idb.openDB('todo', 1)

    let cursor = await db.transaction("elements").store.index("date").openKeyCursor(IDBKeyRange.bound(lower,upper));

    let count=0

    while (cursor) {
        count++
        cursor = await cursor.continue();
    }
    return count
}

async function getCount() {
    try {
        let db = await idb.openDB('todo', 1)

    let tx = db.transaction('elements', 'readonly')
    let store = tx.objectStore('elements')

    // add, clear, count, delete, get, getAll, getAllKeys, getKey, put
    let count = await store.count()
    
    db.close()
    return count
    } catch (error) {
        return -1
    }
}

async function deleteFromId(id){
    try {
        let db = await idb.openDB('todo', 1)

    let tx = db.transaction('elements', 'readwrite')
    let store = tx.objectStore('elements')

    let count = await store.delete(id)
    
    db.close()
    return count
    } catch (error) {
        return -1
    }
}

const itemStyle = "list-group-item d-flex justify-content-between align-items-center"

async function display() {
    ulList.innerHTML= ''
    const list = await getAllDataForDays(current);
    const count = await getCountForDays(current);

    info.innerText = count
    document.title = `To do (${count})`

    list[0].forEach( (element,i) => {
        ulList.innerHTML += liCode(list[1][i], element)
    });

    items = document.querySelectorAll('li.list-group-item')
    items.forEach( item => {
        item.addEventListener( 'mouseover', event => {
            item.lastElementChild.classList.remove("d-none")
        })
        item.addEventListener( 'mouseleave', event => {
            item.lastElementChild.classList.add("d-none")
        })
    })

    document.querySelectorAll("button[data-action=btnAction]").forEach( element => {
        element.addEventListener('click' ,async function (event) {
            const id = element.getAttribute('data-id')
            const role = element.getAttribute('data-role')
            if( role == "delete"){
                await deleteFromId(parseInt(id))
                updatePage()
            }
            else if( role == "check"){
                await checkItemFromId(parseInt(id))
                updatePage()
            }
            else if( role == "prog"){
                document.querySelector('#datePicker-'+parseInt(id)).classList.remove('d-none')
                document.querySelector('#datePicker-'+parseInt(id)).addEventListener('change', async event => {
                    await changeDate(parseInt(id),document.querySelector('#datePicker-'+parseInt(id)).value);
                    updatePage()
                
                })
            }
        
        })
    });

}

let current = new Date()

function displayDate(d = new Date() ){
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    date.innerText = d.toLocaleString('fr-FR', options);
}

async function displayNextDays(from = current){
    
    nextDays.innerHTML = ""
    nextDaysCount.innerHTML = ""

    let today = current;
    for (let index = 0; index < 7; index++) {
        let d = document.createElement('d')
        const options = { weekday: 'short', day: 'numeric' };
        d.innerText = new Date(new Date().setDate(new Date().getDate() + index)).toLocaleString('fr-FR', options);
        d.classList = 'col cursor-pointer'
        d.setAttribute('data-date',new Date(new Date().setDate(new Date().getDate() + index)))
        nextDays.append(d)
        
        d = document.createElement('d')
        d.classList = 'col'
        d.innerText = await getCountForDays(new Date(new Date().setDate(new Date().getDate() + index)))
        nextDaysCount.append(d)
    }

    document.querySelectorAll('[data-date]').forEach( element => {
        element.addEventListener('click' , event =>{
            current = new Date(element.getAttribute('data-date'))
            updatePage()
        })
    })

}

nextDayBtn.addEventListener("click", event => {
    current = new Date(current.setDate(current.getDate()+1))
    updatePage()
})

previousDayBtn.addEventListener("click", event => {
    current = new Date(current.setDate(current.getDate()-1))
    updatePage()
})




function updatePage(){
    displayDate(current)
    display()
    displayNextDays()
}

function renderCategories(){
    for( c in categories){
        let li = document.createElement('li')
        li.innerText=categories[c]+" "+c
        catUl.append(li)
    }
}

renderCategories()