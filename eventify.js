const lodash = require('lodash')
const Events = require('events')
module.exports = function(methods={},channel='message'){
  const events = new Events()

  function request(path,args){
    return {
      type:'request',
      path,
      arguments:args,
    }
  }

  function response(path,args,result){
    return {
      type:'response',
      path,
      arguments:args,
      result,
    }
  }

  function error(path,args,err){
    return {
      type:'error',
      path,
      arguments:args,
      result:err,
    }
  }

  function event(path,args,result){
    return {
      type:'event',
      path,
      arguments:args,
      result
    }
  }

  function emit(...args){
    // console.log('emit',channel,...args)
    return events.emit(channel,...args)
  }

  function isPromise(obj){
    return Promise.resolve(obj) === obj
  }

  function handlePromise(promise,path,args){
    return promise.then(x=>{
      emit(response(path,args,x))
      return x
    }).catch(e=>{
      emit(error(path,args,e))
      throw e
    })
  }

  function handleCallback(cb,path,args){
    if(!lodash.isFunction(cb)) return cb
    return (...result) => {
      cb(...result)
      emit(event(path,args,result))
    }
  }


  function wrapFunction(path,fun){
    return (...args)=>{
      emit(request(path,args))
      try{
        const result = fun(...args.map(x=>handleCallback(x,path,args)))
        if(isPromise(result)){
          return handlePromise(result,path,args)
        }
        emit(response(path,args,result))
        return result
      }catch(e){
        emit(error(path,args,e))
        throw e
      }
    }
  }

  function wrapPrimitive(path,value){
    return value
  }

  function deconstruct(root,context,path=null,visited={},result=[]){
    if(context == null) context = root
    if(path == null){
      path = []
      var val = root
    }else{
      if(visited[path.join('.')]) return result
      visited[path.join('.')] = true
      var val = lodash.get(root,path)
    }

    if(lodash.isFunction(val)){
      // console.log('adding function',path)
      result.push([path,wrapFunction(path,val.bind(context))])
      const pairs = lodash.toPairsIn(val)
      pairs.forEach(([k,v])=>{
        deconstruct(root,val,path.concat([k]),visited,result)
      })
    }else if(lodash.isArray(val)){
      // console.log('adding array',path)
      result.push([path,wrapPrimitive(path,val)])
    }else if(lodash.isObject(val)){
      // console.log('adding object',path)
      const pairs = lodash.toPairsIn(val)
      pairs.forEach(([k,v])=>{
        deconstruct(root,val,path.concat([k]),visited,result)
      })
    }else{
      // console.log('adding primitive',path,val)
      result.push([path,wrapPrimitive(path,val)])
    }

    return result

  }

  function reconstruct(arr=[]){
    return arr.reduce((result,[path,value])=>{
      lodash.set(result,path,value)
      return result
    },{})
  }

  function wrapMethods(methods){
    // const deconstructed = deconstruct(methods)
    const deconstructed = deconstruct(methods)
    const result = reconstruct(deconstructed)
    // return lodash.merge(result,events)
    return result
  }

  return {methods:wrapMethods(methods),events}
}
