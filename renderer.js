// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const path = require('path')
const fs = require("fs")
const low = require('lowdb')
const xl = require('excel4node')
const FileSync = require('lowdb/adapters/FileSync')
const filename = 'json/sales/database-' + (()=>{var a = new Date().toLocaleDateString().split("/"); a.push(a[0]); a.splice(0,1); a.splice(1, 0, a[2]); a.pop(); return a.toString().replace(/\,/g,"-");})() + '.json'
const ipcRenderer = require('electron').ipcRenderer;
const remote = require('electron').remote;
const FindInPage = require('electron-find').FindInPage;
var productadapter;
var salesadapter;
var productdb;
var salesdb;
var promotions;

Number.prototype.roundMultiple = (multiple, x)=>{
    return Math.floor(x/multiple)*multiple;
}

function checkDirectory(directory, callback) {  
    if(fs.existsSync(directory)) {
        callback()
    } else {
        fs.mkdir(directory, callback)
    }
}

class Serverside {
    constructor(){}
    hasprop(obj, prop){
        return Object.prototype.hasOwnProperty.call(obj, prop)
    }
    products(){
        return productdb.get('all.products').value()
    }
    get_database_files(){
        let f = []
        fs.readdirSync('./json/sales').forEach(file=>{
            if (file !== 'database-products.json'){
                f.push("./json/sales/"+file)
            }
        })
        console.log(f);
        return f;
    }
    toExcel(dbpath){
        var sa = new FileSync(dbpath)
        var sdb = low(sa)
        let db = sdb.get("all.sales").value()
        var xb = new xl.Workbook();
        var xs = xb.addWorksheet("Ventes")
        const categories = ["Gerant", "Eleve", "Classe", "Date", "Nom de la collation achete", "Prix de la collation", "Promotion?", "Quantite achetee", "Subtotal", "Total"]
        for(var i = 0; i<categories.length; i++){
            xs.cell(1, i+1)
              .string(categories[i])
        }
        var t = 2;
        if(db.length === 0){
            return "empty"
        }
        for(var sale of db){
            for(var product of sale.produits){
                if(product === sale.produits[0]){
                    xs.cell(t, 1)
                      .string(sale.gerant)
                    xs.cell(t, 2)
                      .string(sale.eleve)
                    xs.cell(t, 3)
                      .string(sale.classe)
                    xs.cell(t, 4)
                      .string(sale.date)
                }
                xs.cell(t, 5)
                  .string(product.name)
                xs.cell(t, 6)
                  .number(product.id === 100 ? sale.extra : product.price)
                if(product.id !== 100){
                    xs.cell(t, 7)
                      .string(product.promo ? "oui" : "non")
                    xs.cell(t, 8)
                      .number(product.quantity)
                }
                if(product === sale.produits[sale.produits.length-1]){
                    xs.cell(t, 9)
                      .number(parseFloat(parseInt(sale.subtotal * 100) / 100))
                    xs.cell(t, 10)
                      .number(parseFloat((parseInt(sale.subtotal * 100) + parseInt(sale.extra * 100)) / 100 ))
                }
                t++
            }
        }
        xs.cell(t+1, 10)
          .formula("=SUM(" + xl.getExcelCellRef(2, 10) + ":" + xl.getExcelCellRef(t, 10)+ ")") 
        try{
            xb.write("./excel/" + dbpath.split("/")[2].replace(".json", "").replace("database-", "") + ".xlsx")
            return true;
        } catch (e) {
            return false;
        }
    }
    sell(information){
        if((this.hasprop(information, "gerant") & this.hasprop(information, "eleve") & this.hasprop(information, "classe") & this.hasprop(information, "date") & this.hasprop(information, "produits") & this.hasprop(information, "extra"))){
            var t = salesdb.get("all.sales")
            var t2 = t.value()
            var product = []
            var total = 0;
            for(var produit of information.produits){
                for(var prod of productdb.get("all.products").value()){
                    if(prod.remaining - product.quantity < 0){
                        return "quant"
                    } else {
                        if(prod.id == produit.id){
                            let pro = prod
                            pro.remaining = pro.remaining - produit.quantity
                            productdb.get("all.products")
                                    .find(prod)
                                    .assign(pro)
                                    .write()
                            product.push({id: prod.id, name: prod.name, price: prod.price, quantity: produit.quantity, promo: promotions().some(element => element.id == produit.id)})
                            if(promotions().some(element => element.id == produit.id)){
                                let promo = promotions().find(element => element.id == produit.id)
                                let applicable = produit.quantity.roundMultiple(parseInt(promo.quantity), parseInt(produit.quantity))
                                let notapplicable = parseInt(produit.quantity) - parseInt(applicable)
                                total += parseInt(((applicable/promo.quantity * promo.price ) + (notapplicable * prod.price ))*100)/100
                            } else {
                                total += parseInt((prod.price * produit.quantity)*100)/100
                            }
                        }
                    }
                }
            }
            salesdb.get("all.sales")
                    .push({id: t2.length, gerant:information.gerant, eleve:information.eleve, classe:information.classe, date:information.date, produits:product, subtotal: parseInt((total)*100)/100, extra:parseInt((information.extra)*100)/100, total:parseInt((total+information.extra)*100)/100})
                    .write()
            return true
            } else {
                return false
            }
    }
    addproduct(information){
        function validate(price){
            if(!price) return false;
            price = typeof(price) === "number" ? price.toFixed(2) : price.toString()
            let regex = new RegExp("^[0-9]+(\.|\,)[0-9]{2}$", "g")
            let test = price.search(regex) === -1 ? false : true
            price = parseFloat(price.replace(",","."))
            if(price === NaN | !test) return false;
            return true;
        }
        if(this.hasprop(information,'product')){
            if(this.hasprop(information.product,'name') & this.hasprop(information.product,'price') & this.hasprop(information.product,'stock') & this.hasprop(information.product,'category')){
                if(Number.isInteger(information.product.stock) & information.product.name.length < 100 & information.product.name.length > 0 & information.product.stock > 0 & ((information.product.category == 1 | information.product.category == 0) ? true : false) & validate(information.product.price)){
                    productdb.get('all.products')
                    .push({ id: productdb.get('all.products').value().length, name: information.product.name, category: information.product.category, price: parseFloat(information.product.price.replace(",", ".")), stock: parseInt(information.product.stock), remaining: parseInt(information.product.stock) })
                    .write()
                    return true
                } else {
                    return false
                }
            } else {
                return false
            }
        } else {
            return false
        }
    }
    removeproduct(information){
        if(this.hasprop(information,'id')){
            if(parseInt(information.id) != NaN){
                var database = productdb.get("all.products")
                console.log(database.value())
            if(!database.value().some(element => element.id == information.id)){
                return false
            } else {
                productdb.get("all.products")
                .remove({id: parseInt(information.id)})
                .write()
                return true
            }
            } else {
            return false
            }
        } else {
            return false
        }
    }
    addpromotions(information){
        function validate(price){
            if(!price) return false;
            price = typeof(price) === "number" ? price.toFixed(2) : price.toString()
            let regex = new RegExp("^[0-9]+(\.|\,)[0-9]{2}$", "g")
            let test = price.search(regex) === -1 ? false : true
            price = parseFloat(price.replace(",","."))
            if(price === NaN | !test) return false;
            return true;
        }
        if(this.hasprop(information,'id') && parseInt(information.id) != NaN){
            if(this.hasprop(information,'quantity') && parseInt(information.quantity) != NaN){
                if(this.hasprop(information,'price') && validate(information.price)){
                    if(!promotions().some(element => element.id == information.id)){
                        for(var i = 0; i<productdb.get("all.products").value().length; i++){
                            if(productdb.get("all.products["+i+"]").value().id == information.id){
                                productdb.set("all.products["+i+"].promotions", {quantity: information.quantity, price: information.price}).write();
                                break;
                            }
                        }
                        return true
                    } else {
                        productdb.get("all.products")
                                    .find({id: parseInt(information.id)})
                                    .assign({promotions: {quantity: information.quantity, price: information.price}})
                                    .write()
                        return true
                    }
                } else {
                    return false
                }
            } else {
                return false
            }
        } else {
            return false
        }
    }
    removepromotions(information){
        if(this.hasprop(information,'id')){
            if(parseInt(information.id) != NaN){
                if(!promotions().some(element => element.id == information.id)){
                    return false
                } else {
                    productdb.get("all.products")
                                .find({id: parseInt(information.id)})
                                .unset('promotions')
                                .write()
                    return true
                }
            } else {
                return false
            }
        } else {
            return false
        }
    }
    changestocks(information){
        if(this.hasprop(information,'id')){
            if(this.hasprop(information,'stock')){
                if(parseInt(information.id) != NaN | !Number.isInteger(parseInt(information.stock))){
                    var database = productdb.get("all.products")
                    console.log(database.value())
                    if(!database.value().some(element => element.id == information.id)){
                        return false
                    } else {
                        productdb.get("all.products")
                                 .find({id: parseInt(information.id)})
                                 .assign({stock: parseInt(information.stock), remaining: parseInt(information.stock)})
                                 .write()
                        return true
                    }
                } else {
                    return false
                }
            } else {
            return false
            }
        } else {
            return false
        }
    }
    feedback(information){
        if(this.hasprop(information, "feedback")){
            let tadapter = new FileSync('./feedback.txt')
            fs.appendFileSync("./feedback.txt", new Date().toISOString() + " :" + information.feedback + "\n")
            return true
        } else {
            return false
        }
    }
}

checkDirectory("./json", ()=>{
    checkDirectory("./json/sales", ()=>{
        checkDirectory("./excel", ()=>{
                productadapter = new FileSync('json/database-products.json')
                salesadapter = new FileSync(filename)
                productdb = low(productadapter)
                salesdb = low(salesadapter)
                productdb.defaults({
                    all: { products: [ {id: 100, name: "Argent en plus du total", category: 0, price: 0.00}, {id: 1, name: "Canette", category: 0, price: 1.00, stock: 10, remaining: 10} ] } 
                })
                        .write()
                salesdb.defaults({
                    all:{ sales:[] }
                })
                    .write()
                promotions = ()=>{
                    function hasprop(obj, prop){
                        return Object.prototype.hasOwnProperty.call(obj, prop)
                    }
                    let database = productdb.get("all.products").value()
                    let array = []
                    database.forEach(element => {
                        if(hasprop(element, "promotions")){
                            let promo = element.promotions
                            promo.id = element.id
                            array.push(promo)
                        }
                    })
                    return array
                }
        })
    })
})

/*let findInPage = new FindInPage(remote.getCurrentWebContents());

ipcRenderer.on('on-find', (e, args) => {
  findInPage.openFindWindow()
})*/