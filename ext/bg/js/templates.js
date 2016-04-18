(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['footer.html'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper;

  return "    <script src=\""
    + container.escapeExpression(((helper = (helper = helpers.root || (depth0 != null ? depth0.root : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"root","hash":{},"data":data}) : helper)))
    + "/js/popup.js\"></script>\n    </body>\n</html>\n";
},"useData":true});
templates['header.html'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<!DOCTYPE html>\n<html lang=\"en\">\n    <head>\n        <meta charset=\"UTF-8\">\n        <title></title>\n        <link rel=\"stylesheet\" href=\""
    + container.escapeExpression(((helper = (helper = helpers.root || (depth0 != null ? depth0.root : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"root","hash":{},"data":data}) : helper)))
    + "/css/popup.css\">\n    </head>\n    <body>\n";
},"useData":true});
templates['kanji.html'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"kanji\">"
    + alias4(((helper = (helper = helpers.character || (depth0 != null ? depth0.character : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"character","hash":{},"data":data}) : helper)))
    + "</div>\n\n<div class=\"reading\">\n    "
    + alias4(((helper = (helper = helpers.kunyomi || (depth0 != null ? depth0.kunyomi : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"kunyomi","hash":{},"data":data}) : helper)))
    + "\n</div>\n\n<div class=\"reading\">\n    "
    + alias4(((helper = (helper = helpers.onyomi || (depth0 != null ? depth0.onyomi : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"onyomi","hash":{},"data":data}) : helper)))
    + "\n</div>\n\n<div class=\"glossary\">\n    "
    + alias4(((helper = (helper = helpers.glossary || (depth0 != null ? depth0.glossary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"glossary","hash":{},"data":data}) : helper)))
    + "\n</div>\n";
},"useData":true});
templates['term.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"term\"><ruby>"
    + alias4(((helper = (helper = helpers.expression || (depth0 != null ? depth0.expression : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"expression","hash":{},"data":data}) : helper)))
    + "<rt>"
    + alias4(((helper = (helper = helpers.reading || (depth0 != null ? depth0.reading : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"reading","hash":{},"data":data}) : helper)))
    + "</rt></ruby></div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<div class=\"term\">"
    + container.escapeExpression(((helper = (helper = helpers.expression || (depth0 != null ? depth0.expression : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"expression","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"rules\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.rules : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <span class=\"rule\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span> "
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(data && data.last),{"name":"unless","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "&laquo;";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"tags\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.tags : depth0),{"name":"each","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"10":function(container,depth0,helpers,partials,data) {
    return "    <span class=\"tag\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span>\n";
},"12":function(container,depth0,helpers,partials,data) {
    return "        <li><span>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span></li>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.reading : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.rules : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.tags : depth0),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<div class=\"glossary\">\n    <ol>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </ol>\n</div>\n";
},"useData":true});
templates['term-list.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"definition\">\n"
    + ((stack1 = container.invokePartial(partials["term.html"],depth0,{"name":"term.html","data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials["header.html"],depth0,{"name":"header.html","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.defs : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = container.invokePartial(partials["footer.html"],depth0,{"name":"footer.html","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"usePartial":true,"useData":true});
})();