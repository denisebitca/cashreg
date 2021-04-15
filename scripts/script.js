var t;

Object.defineProperty(Array.prototype, 'toSelect', {
    value: function() {
        if (this == null) {
            throw TypeError('"this" is null or not defined');
        }
        var o = Object(this);
        var p = arguments[0];
        let sel = $("<select></select>")
        o.forEach(element => {
            if(typeof element === "object"){
                var a = $("<option></option>")
                a.text(p(element.text))
                a.attr("value", element.value)
                sel.append(a)
            } else {
                var a = $("<option></option>")
                a.text(p(element))
                a.attr("value", element)
                sel.append(a)
            }
        })
        return sel[0].outerHTML;
    },
    writable: true,
    configurable: true
});
  
Number.prototype.roundMultiple = (multiple, x)=>{
    return Math.floor(x/multiple)*multiple;
}

function handleprice(pr){
    if(pr === 0) return pr;
    if(!pr) return false;
    pr = typeof(pr) === "number" ? pr.toFixed(2) : pr.toString()
    let regex = new RegExp("^[0-9]+(\.|\,)[0-9]{2}$", "g")
    let test = pr.search(regex) === -1 ? false : true
    pr = parseInt(pr.replace(",","").replace(".",""))
    if(pr == NaN | !test) return false;
    return pr;
}

function price2float(price = Number){
    if(Number.isInteger(price)){
        return price/100
    } else {
        return false;
    }
}

function getBoughtList(){
    $("#receipt").empty()
    let finalprice;
    var bought = customer.bought
    for(var i = 0; i<bought.length; i++){
        //<div class="product"><span>1 x test - 0.01€</span></div>
        var newp = $("<div></div>");
        newp.addClass("product");
        newp.attr("name", bought[i].id)
        newp.attr("quantity", bought[i].quantity)
        var product = customer.Product.findProduct(bought[i].id)
        if(!product) return;
        if(customer.Product.checkPromo(bought[i].id)){
            let promo = customer.Product.getPromo(bought[i].id)
            let applicable = bought[i].quantity.roundMultiple(promo.quantity, bought[i].quantity)
            let notapplicable = bought[i].quantity - applicable
            let prpromo = handleprice(promo.price)
            let pr = handleprice(product.price)
            finalprice = price2float((applicable/promo.quantity * prpromo) + (notapplicable * pr))
        } else {
            finalprice = product.price * bought[i].quantity
        }
        let texty = (bought[i].id === 100 ? "" : (bought[i].quantity + " x ")) + (product.name + " - " + (bought[i].id == 100 ? customer.extra.toFixed(2) : finalprice.toFixed(2)) + "€")
        newp.html("<span>" + texty + "</span>")
        newp.on("click", (event)=>{
            if(parseInt(event.currentTarget.getAttribute("name")) === 100) customer.extra = 0;
            customer.removepurchase(parseInt(event.currentTarget.getAttribute("name")), parseInt(event.currentTarget.getAttribute("quantity")))
            updateUI()
        })
        $("#receipt").append(newp)
    }
}

function display(df){
    var final = $("<div></div>")
    var arr = []
    if(df === "drinks"){
        if(customer.Product.boissons().length === 0){
            createModal("Achat de collations - " + (df === "drinks" ? "Boissons" : "Nourriture"), "<p>Pas de collations enregistrées pour les boissons.</p>") 
            return;
        }
        arr = customer.Product.boissons()
    } else {
        if(customer.Product.nourriture().length === 0){
            createModal("Achat de collations - " + (df === "drinks" ? "Boissons" : "Nourriture"), "<p>Pas de collations enregistrées pour la nourriture.</p>") 
            return;
        }
        arr = customer.Product.nourriture()
    }
    for(var i = 0; i<arr.length; i++){
        var olp = $("<div></div>");
        olp.addClass("product-menu")
        olp.css({"font-size": "15px"}, {"cursor":"pointer"});
        olp.attr("name", arr[i].id)
        olp.append(($("<p></p>")).css({"font-weight": "bold", "font-size":"25px", "text-align":"center"}).text(arr[i].name))
        olp.append(($("<p></p>")).text(arr[i].price + "€").css({"font-size":"20px"}))
        if(arr[i].remaining <= 0){
            olp.append(($("<p></p>")).text("Il n'y a plus de stock pour ce produit !").css({"font-weight":"bold"}))
        } else {
            if(customer.Product.checkPromo(arr[i].id)){
                let promo = $("<p></p>")
                let info = customer.Product.getPromo(arr[i].id)
                promo.text("Promo: " + info["quantity"] + " pour " + info["price"] + "€").css({"font-size":"20px", "font-weight":"bold", "text-decoration":"underline"})
                promo.css("background-color", "yellow")
                olp.append(promo)
            }
            let test = $("<input>")
            test.attr("name", arr[i].id+"-input")
            test.attr("placeholder", "quantité")
            test.attr("value", "1")
            olp.append(test)
            olp.append(($("<p></p>")).text("Stock restant : " + arr[i].remaining))
            let button = $("<button></button>")
            button.text("Ajouter cette quantité")
            button.attr("name", arr[i].id)
            button.attr("onclick", 'customer.purchase(this.getAttribute("name"), parseInt($(this).parent().find("input").val())); updateUI();')
            olp.append(button)
        }
        final.addClass("grid").append(olp)
    }
    createModal("Addition de collations - " + (df === "drinks" ? "Boissons" : "Nourriture"), final[0].outerHTML, [], {largemodal: true})
}

function updateUI(){
    $("#subtotal").val(customer.subtotal.toFixed(2) + "€");
    $("#total").val(customer.total.toFixed(2) + "€");
    getBoughtList()
}

function fail(error){
    $(".loading").fadeOut()
    $("#errortext").text(error)
    $(".nav, .main, .mainpage").fadeOut()
    $(".error").fadeIn()
}

class Product{
    constructor(){
        this.server = new Serverside
    }
    get productlist(){
        return this.server.products()
    }
    nourriture(){
        let arr2 = []
        this.productlist.forEach((product)=>{
            if(product.category === 1 && product.id != 100){
                arr2.push(product)
            }
        })
        return arr2
    }
    boissons(){
        let arr1= []
        this.productlist.forEach((product)=>{
            if(product.category === 0 && product.id != 100){
                arr1.push(product)
            }
        })
        return arr1
    }
    findProduct(id = Number){
        if(!id) return false;
        let prod;
        for(var product of this.productlist){
            if(product.id == id){
                prod = product;
                break;
            }
        }
        return !prod?false:prod;
    }
    checkPromo(id = Number){
        if(!id) return false;
        let promo;
        for(var product of this.productlist){
            if(product.id == id){
                if(Object.prototype.hasOwnProperty.call(product, "promotions")){
                    promo = true;
                    break;
                } else {
                    break;
                }
            }
        }
        return !promo?false:true
    }
    getPromo(id = Number){
        if(!id) return false;
        let promo;
        for(var product of this.productlist){
            if(product.id == id){
                if(Object.prototype.hasOwnProperty.call(product, "promotions")){
                    promo = product.promotions;
                    break;
                } else {
                    break;
                }
            }
        }
        return !promo?false:promo
    }
    addPromo(id = Number, price = Number, quantity = Number){
        if(!id | !quantity | !price) return false;
        let prospectproduct = {
            id: id,
            quantity: quantity,
            price: price,
        }
        return customer.Product.findProduct(id) && handleprice(price) ? this.server.addpromotions(prospectproduct) : false
    }
    removePromo(id = Number){
        if(!id) return false;
        let prospectproduct = {
            id: id
        }
        return customer.Product.findProduct(id) && customer.Product.checkPromo(id) ? this.server.removepromotions(prospectproduct) : false
    }
    addProduct(name = String, category = Number, price = Number, stock = Number){
        if(!name | !category && category !== 0 | !price) return false;
        let prospectproduct = {product: {
            name: name,
            category: category,
            price: price,
            stock: stock
        }}
        return (category === 0 | category === 1) && handleprice(price) ? this.server.addproduct(prospectproduct): false
    }
    removeProduct(id = Number){
        if(!id) return false;
        let prospectproduct = {
            id: id
        }
        return this.findProduct(id) ? this.server.removeproduct(prospectproduct) : false
    }
    changeStocks(id = Number, stock = Number){
        if(!id || !stock && stock !== 0) return false;
        let prospectproduct = {
            id: id,
            stock: stock
        }
        return this.findProduct(id) ? this.server.changestocks(prospectproduct) : false
    }
}

class Client{
    constructor(prod_class){
        this.bought = []
        this.sub = 0
        this.ex = 0
        this.Product = prod_class
    }
    reset(){
        this.bought = []
        this.sub = 0
        this.ex = 0
        return true
    }
    purchase(id, quantity){
        if(!quantity | !id) return false;
        if(parseInt(quantity) === NaN | 0 > parseInt(quantity) | parseInt(id) === NaN) return false;
        let product = this.Product.findProduct(id)
        if(!product) return false;
        if(this.bought.some(element=>element.id === id)) {
            for(var i in this.bought){
                if(this.bought[i].id === id){
                    if(product.remaining - this.bought[i].quantity - parseInt(quantity) < 0 && product.id != 100){
                        alert("Ce n'est pas possible d'acheter plus que les stocks restants.")
                        return false;
                    } else {
                        if(product.id != 100){
                            this.bought[i].quantity += parseInt(quantity)
                            return true;
                        } else {
                            return true;
                        }
                    }
                }
            }
        } else {
            if(product.remaining - parseInt(quantity) >= 0 || product.id == 100){
                this.bought.push({id: id, quantity: parseInt(quantity)})
                return true;
            } else {
                alert("Ce n'est pas possible d'acheter plus que les stocks restants.")
                return false;
            }
        }
    }
    findpurchase(id){
        if(!id) return false;
        if(parseInt(id) === NaN) return false;
        for(var purchase of this.bought){
            if(purchase.id == id){
                return purchase
            }
        }
        return false;
    }
    removepurchase(id, quantity){
        if(!quantity | !id) return false;
        if(parseInt(quantity) === NaN | parseInt(id) === NaN) return false;
        if(this.bought.some(element=>parseInt(element.id) === id)) {
            for(var f = 0; f<this.bought.length; f++){
                if(parseInt(this.bought[f].id) === id){
                    this.bought[f].quantity -= parseInt(quantity)
                    if(this.bought[f].quantity == 0){
                        this.bought = this.bought.filter(element => parseInt(element.id) !== id)
                    }
                }
            }
        } else {
            return false;
        }
    }
    get subtotal(){
        this.sub = 0;
        this.Product.productlist.forEach(product => {
            this.bought.forEach(purchase =>{
                if(product.id == purchase.id){
                    if(this.Product.checkPromo(purchase.id)){
                        let promo = this.Product.getPromo(purchase.id)
                        let applicable = purchase.quantity.roundMultiple(promo.quantity, purchase.quantity)
                        let notapplicable = purchase.quantity - applicable
                        let prpromo = handleprice(promo.price)
                        let pr = handleprice(product.price)
                        this.sub += ((applicable/promo.quantity) * prpromo) + (notapplicable * pr)
                    } else {
                        let pr = handleprice(product.price)
                        this.sub += (pr * purchase.quantity)
                    }
                }
            })
        })
        return price2float(this.sub);
    }
    set extra(ex){
        if(this.ex === 0 && ex !== 0){
            this.purchase(100, 1)
        }
        if(!Number.isInteger(ex) |!handleprice(price2float(ex)) && handleprice(price2float(ex)) !== 0){
            alert("Erreur sur la syntaxe. Veuillez vérifier ce que vous avez écrit.")
            throw new Error("Erreur sur la syntaxe. Veuillez vérifier ce que vous avez écrit.")
        }
        this.ex = ex
    }
    get extra(){
        return price2float(this.ex)
    }
    get total(){
        return price2float(handleprice(this.extra) + handleprice(this.subtotal))
    }
}

var customer = new Client(new Product())

window.onload = ()=>{
    updateUI()
    $("#menu>.category").on('click', (event)=>{
        switch(event.currentTarget.getAttribute("name")){
            case "changeprod":
                createModal("Modifier collations", '<p>Vouliez-vous supprimer, ajouter une collation ou changer les stocks disponibles ?<br><b>Attention: si vous etiez entrain de faire une vente, elle sera effacé lors de cette procédure. Veuillez cliquer sur la croix pour quitter la procédure.</b></p>', [
                    {
                        id: "1",
                        text: "Supprimer",
                        bgcolor: "rgb(255, 0, 0)",
                        color: "#ffffff",
                        callback: ()=>{
                            let input = [];
                            customer.Product.productlist.forEach((product)=>{
                                if(product.id != 100) input.push({text: product.name, value: product.id})
                            })
                            if(input.length === 0){
                                createModal("Supprimer collations", "<p>Il n'y a pas de collations à supprimer.</p>")
                                return;
                            }
                            createModal("Supprimer collations", input.toSelect(a=>{return a;}), [
                                {
                                    id: "1",
                                    text: "Continuer",
                                    bgcolor: "rgb(255, 0, 0)",
                                    color: "#ffffff",
                                    callback: ()=>{
                                        let result = $("#modal-1-content>select")[0].options[$("#modal-1-content>select")[0].options.selectedIndex].value
                                        try{
                                            if(!customer.Product.removeProduct(parseInt(result))){
                                                createModal("Erreur","<p>Erreur avec la suppression de la collation. Veuillez signaler ce problème.</p>")
                                            } else {
                                                customer.reset()
                                                updateUI()
                                                createModal("Succès !","<p>Collation supprimée !</p>")
                                            }
                                        } catch(e) {
                                            createModal("Erreur","<p>Erreur avec la suppression de la collation. Veuillez signaler ce problème.</p>")
                                        }
                                    }
                                }
                            ])
                        }
                    },
                    {
                        id: "2",
                        text: "Modifier stocks",
                        bgcolor: "rgb(0, 0, 122)",
                        color: "#ffffff",
                        callback: ()=>{
                            let input = [];
                            customer.Product.productlist.forEach((product)=>{
                                if(product.id != 100) input.push({text: product.name, value: product.id})
                            })
                            if(input.length === 0){
                                createModal("Modifier stocks", "<p>Il n'y a pas de stocks à modifier.</p>")
                                return;
                            }
                            createModal("Modifier stocks", "<p>Selectionnez le produit à modifier:</p>" + input.toSelect(a=>{return a;}), [
                                {
                                    id: "1",
                                    text: "Continuer",
                                    bgcolor: "rgb(255, 0, 0)",
                                    color: "#ffffff",
                                    callback: ()=>{
                                        let result = $("#modal-1-content>select")[0].options[$("#modal-1-content>select")[0].options.selectedIndex].value
                                        let re;
                                        createModal("Modifier stocks","<p>Et quels seront les stocks ?</p><input maxlength='100' name='te' type='text' class='modalinput'>", [
                                            {
                                                id: "cont", 
                                                text:"Continuer", 
                                                bgcolor: "#ef1111", 
                                                color: "#ffffff",
                                                callback: ()=>{
                                                    re = $("input[name=te]").val()
                                                    if(!re || !Number.isInteger(parseInt(re))) MicroModal.close("modal-1")
                                                    try{
                                                        if(!customer.Product.changeStocks(parseInt(result), parseInt(re))){
                                                            createModal("Erreur","<p>Erreur avec le changement des stocks. Veuillez signaler ce problème.</p>")
                                                        } else {
                                                            customer.reset()
                                                            updateUI()
                                                            createModal("Succès","<p>Collation changée !</p>")
                                                        }
                                                    } catch(e) {
                                                        createModal("Erreur","<p>Erreur avec la suppression de la collation. Veuillez signaler ce problème.</p>")
                                                    }
                                                }
                                            }]
                                        )
                                        $("input[name=te]").val(customer.Product.findProduct(parseInt(result)).stock)
                                    }
                                }
                            ])
                        }
                    },
                    {
                        id: "3",
                        text: "Ajouter",
                        bgcolor: "rgb(0, 122, 0)",
                        color: "#ffffff",
                        callback: ()=>{
                            let name;
                            let quantity;
                            let price;
                            createModal("Ajouter collations", "<p>Quel sera le nom de la collation ? (sans accents)</p><input maxlength='100' name='ajouter1' type='text' class='modalinput'>", [
                                {
                                    id: "1",
                                    text: "Continuer",
                                    bgcolor: "rgb(255, 0, 0)",
                                    color: "#ffffff",
                                    callback: ()=>{
                                        name = $("input[name=ajouter1]").val()
                                        if(!name) MicroModal.close("modal-1")
                                        function next(category){createModal("Ajouter collations", "<p>Combien de stocks ?</p><input maxlength='100' name='ajouter1' type='text' class='modalinput'>", [
                                            {
                                                id: "1",
                                                text: "Continuer",
                                                bgcolor: "rgb(255, 0, 0)",
                                                color: "#ffffff",
                                                callback: ()=>{
                                                    quantity = $("input[name=ajouter1]").val()
                                                    if(!quantity || !Number.isInteger(parseInt(quantity))) MicroModal.close("modal-1")
                                                    createModal("Ajouter collations","<p>Et quel sera le prix ?</p><input maxlength='100' name='vente1' type='text' class='modalinput'>", [
                                                        {
                                                            id: "cont", 
                                                            text:"Continuer", 
                                                            bgcolor: "#ef1111", 
                                                            color: "#ffffff",
                                                            callback: ()=>{
                                                                price = $("input[name=vente1]").val()
                                                                if(!price || price === "") MicroModal.close("modal-1")
                                                                if(!handleprice(price)){
                                                                    createModal("Erreur","<p>Syntaxe invalide, veuillez vérifier ce que vous avez rédigé.</p>")
                                                                    return;
                                                                }
                                                                try{
                                                                    if(!customer.Product.addProduct(name, category, price, parseInt(quantity))){
                                                                        createModal("Erreur","<p>Erreur avec l'insertion de la collation. Veuillez signaler ce problème.</p>")
                                                                    } else {
                                                                        customer.reset()
                                                                        updateUI()
                                                                        createModal("Succès !","<p>Collation ajoutée !</p>")
                                                                    }
                                                                } catch(e) {
                                                                    console.log(e)
                                                                    createModal("Erreur","<p>Erreur avec l'insertion de la promotion. Veuillez signaler ce problème.</p>")
                                                                }
                                                            }
                                                        }
                                                    ])
                                                }
                                            }
                                        ])}
                                        createModal("Ajouter collations", "<p>Quelle sera la catégorie ?</p>", [{
                                            id: "1",
                                            text: "Boissons",
                                            bgcolor: "#000000",
                                            color: "#ffffff",
                                            callback: ()=>{
                                                next(0)
                                            }
                                        },{
                                            id: "2",
                                            text: "Nourriture",
                                            bgcolor: "#000000",
                                            color: "#ffffff",
                                            callback: ()=>{
                                                next(1)
                                            }
                                        }])
                    

                                        
                                    }
                                }
                            ])
                        }
                    }
                ])
                break;
            case "changepromo":
                createModal("Modifier promotions", '<p>Vouliez-vous supprimer ou ajouter une collation ?<br><b>Attention: si vous etiez entrain de faire une vente, elle sera effacé lors de cette procédure. Veuillez cliquer sur la croix pour quitter la procédure.</b></p>', [
                    {
                        id: "1",
                        text: "Supprimer",
                        bgcolor: "rgb(255, 0, 0)",
                        color: "#ffffff",
                        callback: ()=>{
                            let input = [];
                            customer.Product.productlist.forEach((product)=>{
                                if(Object.prototype.hasOwnProperty.call(product, "promotions")){
                                    input.push({text: product.promotions.quantity + " " + product.name + " pour " + product.promotions.price + "€", value: product.id})
                                }
                            })
                            if(input.length === 0){
                                createModal("Supprimer promotions", "<p>Il n'y a pas de promotions à supprimer.</p>")
                                return;
                            }
                            createModal("Supprimer promotions", input.toSelect(a=>{return a;}), [
                                {
                                    id: "1",
                                    text: "Continuer",
                                    bgcolor: "rgb(255, 0, 0)",
                                    color: "#ffffff",
                                    callback: ()=>{
                                        let result = $("#modal-1-content>select")[0].options[$("#modal-1-content>select")[0].options.selectedIndex].value
                                        try{
                                            if(!customer.Product.removePromo(parseInt(result))){
                                                createModal("Erreur","<p>Erreur avec la suppression de la promotion. Veuillez signaler ce problème.</p>")
                                            } else {
                                                customer.reset()
                                                updateUI()
                                                createModal("Succès !","<p>Promotion supprimée !</p>")
                                            }
                                        } catch(e) {
                                            createModal("Erreur","<p>Erreur avec la suppression de la promotion. Veuillez signaler ce problème.</p>")
                                        }
                                    }
                                }
                            ])
                        }
                    },
                    {
                        id: "2",
                        text: "Modifier",
                        bgcolor: "rgb(0, 0, 122)",
                        color: "#ffffff",
                        callback: ()=>{
                            let input = [];
                            customer.Product.productlist.forEach((product)=>{
                                if(Object.prototype.hasOwnProperty.call(product, "promotions")){
                                    input.push({text: product.promotions.quantity + " " + product.name + " pour " + product.promotions.price + "€", value: product.id})
                                }
                            })
                            if(input.length === 0){
                                createModal("Modifier promotions", "<p>Il n'y a pas de promotions à modifier.</p>")
                                return;
                            }
                            createModal("Modifier promotions", input.toSelect(a=>{return a;}), [
                                {
                                    id: "1",
                                    text: "Continuer",
                                    bgcolor: "rgb(255, 0, 0)",
                                    color: "#ffffff",
                                    callback: ()=>{
                                        let res = $("#modal-1-content>select")[0].options[$("#modal-1-content>select")[0].options.selectedIndex].value
                                        let quantity;
                                        let price;
                                        createModal("Modifier promotions", "<p>Quelle sera la quantité minimale (x) pour que la promotion s'applique ?</p><input maxlength='100' name='ajouter1' type='text' class='modalinput'>", [
                                            {
                                                id: "1",
                                                text: "Continuer",
                                                bgcolor: "rgb(255, 0, 0)",
                                                color: "#ffffff",
                                                callback: ()=>{
                                                    quantity = $("input[name=ajouter1]").val()
                                                    if(!quantity || !Number.isInteger(parseInt(quantity))) MicroModal.close("modal-1")
                                                    createModal("Modifier promotions","<p>Et quel sera le prix ?</p><input maxlength='100' name='vente1' type='text' class='modalinput'>", [
                                                        {
                                                            id: "cont", 
                                                            text:"Continuer", 
                                                            bgcolor: "#ef1111", 
                                                            color: "#ffffff",
                                                            callback: ()=>{
                                                                price = $("input[name=vente1]").val()
                                                                if(!price || price === "") MicroModal.close("modal-1")
                                                                if(!handleprice(price)){
                                                                    createModal("Erreur","<p>Syntaxe invalide, veuillez vérifier ce que vous avez rédigé.</p>")
                                                                    return;
                                                                }
                                                                try{
                                                                    if(!customer.Product.addPromo(parseInt(res), price2float(handleprice(price)), parseInt(quantity))){
                                                                        createModal("Erreur","<p>Erreur avec l'insertion de la promotion. Veuillez signaler ce problème.</p>")
                                                                    } else {
                                                                        customer.reset()
                                                                        updateUI()
                                                                        createModal("Succès !","<p>Promotion ajoutée !</p>")
                                                                    }
                                                                } catch(e) {
                                                                    createModal("Erreur","<p>Erreur avec l'insertion de la promotion. Veuillez signaler ce problème.</p>")
                                                                }
                                                            }
                                                        }
                                                    ])
                                                }
                                            }
                                        ])
                                    }
                                }
                            ])
                        }
                    },
                    {
                        id: "3",
                        text: "Ajouter",
                        bgcolor: "rgb(0, 122, 0)",
                        color: "#ffffff",
                        callback: ()=>{
                            let input = [];
                            customer.Product.productlist.forEach((product)=>{
                                if(product.id != 100) input.push({text: product.name, value: product.id})
                            })
                            if(input.length === 0){
                                createModal("Ajouter promotions", "<p>Il n'y a pas de promotions à ajouter.</p>")
                                return;
                            }
                            createModal("Ajouter promotions", "<p>Selectionnez un produit:</p>" + input.toSelect(a=>{return a;}), [
                                {
                                    id: "1",
                                    text: "Continuer",
                                    bgcolor: "rgb(255, 0, 0)",
                                    color: "#ffffff",
                                    callback: ()=>{
                                        let res = $("#modal-1-content>select")[0].options[$("#modal-1-content>select")[0].options.selectedIndex].value
                                        let quantity;
                                        let price;
                                        createModal("Ajouter promotions", "<p>Sachant que vous pouvez insérer uniquement des promotions du type 'x produit(s) pour y €', quelle sera la quantité minimale (x) pour que la promotion s'applique ?</p><input maxlength='100' name='ajouter1' type='text' class='modalinput'>", [
                                            {
                                                id: "1",
                                                text: "Continuer",
                                                bgcolor: "rgb(255, 0, 0)",
                                                color: "#ffffff",
                                                callback: ()=>{
                                                    quantity = $("input[name=ajouter1]").val()
                                                    if(!quantity || !Number.isInteger(parseInt(quantity))) MicroModal.close("modal-1")
                                                    createModal("Ajouter promotions","<p>Et quel sera le prix ?</p><input maxlength='100' name='vente1' type='text' class='modalinput'>", [
                                                        {
                                                            id: "cont", 
                                                            text:"Continuer", 
                                                            bgcolor: "#ef1111", 
                                                            color: "#ffffff",
                                                            callback: ()=>{
                                                                price = $("input[name=vente1]").val()
                                                                if(!price || price === "") MicroModal.close("modal-1")
                                                                if(!handleprice(price)){
                                                                    createModal("Erreur","<p>Syntaxe invalide, veuillez vérifier ce que vous avez rédigé.</p>")
                                                                    return;
                                                                }
                                                                try{
                                                                    if(!customer.Product.addPromo(parseInt(res), price2float(handleprice(price)), parseInt(quantity))){
                                                                        createModal("Erreur","<p>Erreur avec l'insertion de la promotion. Veuillez signaler ce problème.</p>")
                                                                    } else {
                                                                        customer.reset()
                                                                        updateUI()
                                                                        createModal("Succès !","<p>Promotion ajoutée !</p>")
                                                                    }
                                                                } catch(e) {
                                                                    createModal("Erreur","<p>Erreur avec l'insertion de la promotion. Veuillez signaler ce problème.</p>")
                                                                }
                                                            }
                                                        }
                                                    ])
                                                }
                                            }
                                        ])
                                    }
                                }
                            ])
                        }
                    }
                ])
                break;
            case "export":
                let db = customer.Product.server.get_database_files()
                createModal("Exporter sous Excel", (()=>{let f = $("<div></div>"); let g = $("<p></p>").text("Veuillez selectionner le jour à exporter :"); let z = $($.parseHTML(db.toSelect((a)=>{return a.split("/")[2].replace(".json", "").replace("database-", "")}))); return f.append(g, z)[0].outerHTML})(), [{
                    id: "cont", 
                    text:"Continuer", 
                    bgcolor: "#ef1111", 
                    color: "#ffffff",
                    callback: ()=>{
                        MicroModal.close("modal-1")
                        try{
                            let ef = customer.Product.server.toExcel($("#modal-1-content>div>select")[0].options[$("#modal-1-content>div>select")[0].options.selectedIndex].value)
                            if(ef === "empty"){
                                createModal("Information","<p>Aucune vente a été effectuée ce jour la.</p>")
                            } else if(ef){
                                createModal("Succès!","<p>Exportation réalisée avec succès.</p>")
                            } else {
                                createModal("Erreur","<p>Erreur avec exportation. Veuillez signaler cet erreur. CODE: EXP1</p>")
                            }
                        } catch(e) {
                            console.log(e)
                            alert("Erreur avec exportation. Veuillez signaler cet erreur. CODE: EXP2")
                        }
                    }
                }]);
                break;
            case "report":
                let result;
                createModal("Signaler un problème", "<p>Veuillez rédiger ce que vous fesiez lorsque vous avez eu le problème :</p><input maxlength='100' name='vente1' type='text' class='modalinput'>", [{
                    id: "1",
                    text: "Envoyer", 
                    bgcolor: "#000000", 
                    color: "#ffffff",
                    callback: function(){
                        result = $("input[name=vente1]").val()
                        if(!result || result === "") MicroModal.close("modal-1")
                        if(!customer.Product.server.feedback({feedback: result})){
                            createModal("Erreur","<p>Erreur lors de l'envoi, veuillez signaler vos problèmes à une personne.</p>")
                        } else {
                            createModal("Succès","<p>Le problème a été signalé. Veuillez avertir la vie scolaire de cette erreur.</p>")
                        }
                    }
                }])
                break;
        }
    })
    $("#sb>.button").on('click', (event)=>{
        switch(event.currentTarget.getAttribute("name")){
            case "addmoney":
                createModal("Ajouter argent","<p>Combien d'argent à ajouter au total ?</p><input maxlength='100' name='vente1' type='text' class='modalinput'>", [{
                    id: "cont", 
                    text:"Continuer", 
                    bgcolor: "#ef1111", 
                    color: "#ffffff",
                    callback: ()=>{
                        price = $("input[name=vente1]").val()
                        if(!price || price === "") MicroModal.close("modal-1")
                        if(!handleprice(price)){
                            createModal("Erreur","<p>Syntaxe invalide, veuillez vérifier ce que vous avez rédigé.</p>")
                            return;
                        }
                        customer.extra = customer.ex + handleprice(price)
                        updateUI();
                        MicroModal.close("modal-1")
                    }
                }])
                break;
            case "sell":
                var gerant;
                var eleve;
                var classe;
                if(customer.total === 0) break;
                createModal("Vente", "<p>Le prénom du gérant que effectue la vente:</p><input maxlength='100' name='vente1' type='text' class='modalinput'>", [{
                    id: "cont", 
                    text:"Continuer", 
                    bgcolor: "#ef1111", 
                    color: "#ffffff",
                    callback: ()=>{
                        if(!($("input[name=vente1]").val() === "")){
                            gerant = $("input[name=vente1]").val()
                            createModal("Vente", "<p>Le prénom de la personne qui achète:</p><input maxlength='100' name='vente1' type='text' class='modalinput'>", [{
                                id: "cont", 
                                text:"Continuer", 
                                bgcolor: "#ef1111", 
                                color: "#ffffff",
                                callback: ()=>{
                                    if(!($("input[name=vente1]").val() === "")){
                                        eleve = $("input[name=vente1]").val()
                                        createModal("Vente", "<p>La classe de la personne qui achète:</p><input maxlength='100' type='text' name='vente1' class='modalinput'>", [{
                                            id: "cont", 
                                            text:"Continuer", 
                                            bgcolor: "#ef1111", 
                                            color: "#ffffff",
                                            callback: ()=>{
                                                if(!($("input[name=vente1]").val() === "")){
                                                    classe = $("input[name=vente1]").val()
                                                    if(customer.total > 99.99){
                                                        createModal("Attention","<p>La transaction excède 99,99 €, veuillez avertir la vie scolaire avant de faire cette vente.</p>")
                                                    }
                                                    let b = moment().locale('fr');
                        
                                                    let sale = customer.Product.server.sell({
                                                        gerant: gerant,
                                                        eleve: eleve,
                                                        classe: classe,
                                                        date: b.format('DD/MM/YYYY H:mm:ss'),
                                                        produits: customer.bought,
                                                        extra: customer.extra
                                                    })
                                                    if(sale && sale != "quant"){
                                                        customer.reset()
                                                        updateUI()
                                                        createModal("Succès","<p>Vendu !</p>")
                                                    } else {
                                                        if(sale != true && sale != "quant"){
                                                            alert("La vente n'a pas été sauvegardée par erreur ! Veuillez signaler l'erreur avec une description détaillé de ce que vous fesiez avant cette erreur.")
                                                        } else if(sale === "quant"){
                                                            alert("Il n'y a pas de stock suffisant pour une ou plusieurs collations que vous essayez d'acheter.")
                                                            customer.reset()
                                                            updateUI()
                                                        }
                                                    }
                                                } else {
                                                    MicroModal.close("#modal-1")
                                                    return;
                                                }
                                            }
                                        }])
                                    } else {
                                        MicroModal.close("#modal-1")
                                        return;
                                    }
                                }
                            }])
                        } else {
                            MicroModal.close("#modal-1")
                            return;
                        }
                    }
                }])
                break;
            case "clear":
                customer.reset()
                updateUI()
                createModal("Effacer", "<p>Effacement conclu !</p>")
                break;
        }
    })
    $("#inventory>.button").on('click', (event)=>{
        display(event.currentTarget.getAttribute("name"))
    })
}

function showMenu(){
    let l = document.querySelector("#menubutton").getAttribute("data")
    l === "0" ? (()=>{
        clearTimeout(t)
        let sheet = new CSSStyleSheet()
        sheet.replaceSync('html, body{overflow: hidden} #menu {display:flex; animation: slidein 0.5s;}');
        document.adoptedStyleSheets = [sheet];
        t = setTimeout(()=>{
            let sheet = new CSSStyleSheet()
            sheet.replaceSync('html, body{overflow: hidden} #menu {display:flex;}');
            document.adoptedStyleSheets = [sheet];
        }, 450)
        document.querySelector("#menubutton").setAttribute("data", "1")
    })() : (()=>{
        clearTimeout(t)
        let sheet = new CSSStyleSheet()
        sheet.replaceSync('html, body{overflow: hidden} #menu {display: flex; animation: slideout 0.5s;}');
        document.adoptedStyleSheets = [sheet];
        t = setTimeout(()=>{
            let sheet = new CSSStyleSheet()
            sheet.replaceSync('');
            document.adoptedStyleSheets = [sheet];
        }, 450)
        document.querySelector("#menubutton").setAttribute("data", "0")
    })()
}
