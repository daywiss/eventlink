const lodash = require('lodash')
module.exports = Handlers = (path=[], cb, This) => {
  const log = (...args)=>{
    console.log(...args)
    return args[0]
  }

  function cbHandlers(path,cb){
    return {
      apply:(target,context,args)=>{
        const proxyArgs = args.map((arg,i)=>{
          if(!lodash.isFunction(arg)) return arg
          return new Proxy(arg,cbHandlers(path,cb))
        })
        let result =  Reflect.apply(target,context,proxyArgs)
        cb('async',path,'apply',args,result)
      }
    }
  }

  return {
    get:(target,prop,receiver)=>{
      const p = path.concat([prop])
      cb('request',p,'get',prop)
      let result = Reflect.get(target,prop,receiver)
      // return cb('response',p,'get',[prop],result,target)
      // return log(cb('response',p,'get',[prop],result),'get response',p)

      if(lodash.isFunction(result)){
        result = result.bind(target)
      }
      // if(isPromise(result)){
      //   // console.log('promise',path,target,args)
      //   // return new Proxy(result,Handlers(path,cb))
      //   return tapPromise(result)
      // }
      
      cb('response',p,'get',result)

      if(lodash.isObject(result)){
        return new Proxy(result,Handlers(path.concat([prop]),cb))
      }
      // cb('response',path.concat([prop]),result)
      return result
    },
    // set:(target, prop, value)=>{
    //   console.log('set',target,prop)
    //   return Reflect.set(target,prop,value)
    // },
    apply:(target, context, args)=>{
      cb('request',path,'apply',args)
      const proxyArgs = args.map((arg,i)=>{
        if(!lodash.isFunction(arg)) return arg
        return new Proxy(arg,cbHandlers(path,cb))
        // return (...args)=>{
        //   console.log('clalback called',path,args)
        //   return arg(...args)
        // }
      })

      let result =  Reflect.apply(target,context,proxyArgs)

      if(lodash.isFunction(result)){
        result = result.bind(target)
      }

      cb('response',path,'apply',args,result)

      if(lodash.isObject(result)){
        return new Proxy(result,Handlers(path,cb))
      }
      return result

      // const result = Reflect.apply(target,context,args)
      // return cb('response',path,'apply',args,result)

      // cb('request',path,args)
      // const proxyArgs = args.map(arg=>{
      //   if(!lodash.isFunction(arg)) return arg
      //   console.log('found cb',path,arg.toString())
      //   return new Proxy(arg,Handlers(path,cb))
      // })
      // // const result = target.apply(them,args)
      // const result = Reflect.apply(target,them,proxyArgs)

      // if(isPromise(result)){
      //   console.log('promise',path,target,args)
      //   // return new Proxy(result,Handlers(path,cb))
      //   return tapPromise(result)
      // }
      // // if(lodash.isFunction(result)){
      // //   console.log('returned func',path)
      // //   result.bind(target)
      // // }

      // if(lodash.isObject(result)){
      //   return new Proxy(result,Handlers(path,cb))
      // }
      // return cbresult
    },
    // construct:(target,args)=>{
    //   cb('construct',target,args)
    //   return new target(...args)
    // }
  }

}
