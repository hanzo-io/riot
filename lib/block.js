
/* Container for loops, custom tags and conditionals */

function Block(tag, fns, root, item) {

  var ifs = [],
    loops = [],
    tags = [],
    expr = []


  // extract dynamic parts for later execution
  walk(root, function(node) {

    // if
    attr = remAttr(node, 'if')
    var cond = getFunction(attr)
    if (cond) { ifs.push(new IF(node, tag, cond, item)); return false }

    // each
    var attr = remAttr(node, 'each'), query = getFunction(attr)
    if (query) { loops.push([query, node]); return false }

    // custom tag
    var name = getTagName(node)
    if (node != tag.root && isCustom(name)) {
      riot.mount(name, node, item); return false
    }

    // body expression
    var fn = getFunction(node.nodeValue)

    fn && expr.push(function() {
      var arr = fn.call(tag, item),
        val = toValue(arr)

      if (hasHTML(arr)) {
        var parent = node.parent || node.parentNode
        parent.innerHTML = val
        node.parent = parent
      }
      else node.nodeValue = val
    })

    // attribute expressions
    parseAttributes(node)

  })

  // loops must be constructed after walk()
  loops = loops.map(function(args) {
    return new Loop(args[0], args[1], tag, fns, item)
  })


  this.update = function() {
    each(ifs.concat(tags).concat(loops), function(el) {
      el.update()
    })

    each(expr, function(fn) {
      fn.call(tag, item)
    })

  }


  /** private **/


  // maps and expression ("$1") to a real function() {}
  function getFunction(str) {
    if (str) {
      str = str.trim()
      var i = 1 * str.slice(1)
      if (str[0] == '$' && i >= 0) return fns[i]
    }
  }


  function setEventHandler(node, name, getter) {
    node.removeAttribute(name)

    node.addEventListener(name.slice(2), function(e) {
      var fn = getter.call(tag, e, item)

      if (fn) {
        var ret = fn.call(tag, e, item)
        tag.update()
        return ret
      }
    })
  }

  function parseAttributes(node) {

    each(node.attributes, function(attr) {
      var fn = getFunction(attr.value)
      if (!fn) return
      attr.value = ''

      var name = attr.name

      // event handler
      if (name.slice(0, 2) == 'on') {
        setEventHandler(node, name, fn)

      } else {
        expr.push(function() {
          var val = fn.call(tag, item)

          // node.changed == changed parent node for custom tags
          ;(node.changed || node).setAttribute(name, toValue(val))
        })
      }

    })
  }

}