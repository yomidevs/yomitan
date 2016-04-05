(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['defs.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"yomichan-def\">\n"
    + ((stack1 = container.invokePartial(partials["term.html"],depth0,{"name":"term.html","data":data,"indent":"    ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "    "
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(data && data.last),{"name":"unless","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "<br>";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.defs : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"usePartial":true,"useData":true});
templates['term.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<div class=\"yomichan-def-reading\">"
    + container.escapeExpression(((helper = (helper = helpers.reading || (depth0 != null ? depth0.reading : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"reading","hash":{},"data":data}) : helper)))
    + "</div>";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"yomichan-def-expression\">"
    + alias4(((helper = (helper = helpers.expression || (depth0 != null ? depth0.expression : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"expression","hash":{},"data":data}) : helper)))
    + "</div>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.reading : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n<div class=\"yomichan-def-glossary\">"
    + alias4(((helper = (helper = helpers.glossary || (depth0 != null ? depth0.glossary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"glossary","hash":{},"data":data}) : helper)))
    + "</div>\n";
},"useData":true});
})();