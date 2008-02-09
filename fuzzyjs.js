/*
Array.prototype.last=function(){
		return this[this.length-1];
}

Object.prototype.extend=function(obj){
	for (var i in obj){
		this[i]=obj[i];
	}
}

Object.prototype.serialize=function(){
		var str="{";
		for (var i in this){
				str+=i+":"+(((typeof this[i])=="object")?this[i].serialize():this[i])+",\n";
		}
		str+"}";
		return str;
}
Function.prototype.serialize=function(){
		return this;
}
*/

var Clase=function(){
	this.extend=function(obj){
	for (var i in obj){
		this[i]=obj[i];
	}
  }
}


var DEBUG=false;
/////////////////////////// Auxiliares /////////////////////////

function min(a,b){return a<b?a:b;}
function max(a,b){return a>b?a:b;}

function interpolacion(x0,x1,y0,y1,x){
		return (x-x0)*(y1-y0)/(x1-x0) + y0;
}

function interseccion(x0,x1,ya1,ya2,yb1,yb2,fun){

			if ((fun(ya1,yb1)==ya1)&&(fun(ya2,yb2)==ya2)) 
					return [{x:x0,y:ya1},{x:x1,y:ya2}];
			if ((fun(ya1,yb1)==yb1)&&(fun(ya2,yb2)==yb2))
					return [{x:x0,y:yb1},{x:x1,y:yb2}];

			var denominador=(yb2-yb1-ya2+ya1);
			if (denominador==0){
					denominador=1;
			}
			var medio=((ya1-yb1)*(x1-x0))/denominador+x0;
			return [{x:x0,y:fun(ya1,yb1)},
						{x:medio,y:interpolacion(x0,x1,ya1,ya2,medio)},
					{x:x1,y:fun(yb2,ya2)}];
}

function redondear(val,digitos){
		if (!digitos)digitos=2;
		return Math.floor(val*Math.pow(10,digitos))/Math.pow(10,digitos);
}


function oav(o,a,v){
		return {"o":o,"a":a,"v":v,"texto":function(){
					return "oav("+this.o+","+this.a+","+redondear(this.v)+")";
				}};
}
function oa(o,a){
				return oav(o,a,1);
}
function oan(o,a,n){
		// Cuidado!.. variables tiene que estar definido.
		try{
		return oav(o,a,variables[o][a].evalua(n));
		}catch(e){
			alert("["+[o,a,n]+"]: Es necesario definir previamente el conjunto de variables ("+e+")");
		}
}
//////////////////////////////////////////////////////////////////////

var ConjuntoAbstracto={
	cota:function(values,superior,field){
		field=(!field)?"y":field;
		m=superior?0:1;
		for (var i in values){
			var v=values[i];
			if (superior?v[field]>m:v[field]<m) m=v[field];
		}
		return m;
	},
	setValues:function(values){
		this.values=values;
	},
	getIterator:function(){	
		return new (function(self){
			var curr=0;
			this.next=function(){
				return self.values[curr++];
			}
			this.hasNext=function(){
				return curr<self.values.length;
			}
		})(this);
	},
	min:function(){
		return this.cota(this.values,false);
	},	
	max:function(){
		return this.cota(this.values,true);
	},	
	inicio:function(){
		return this.cota(this.values,false,"x");
	},	
	final:function(){
		return this.cota(this.values,true,"x");
	},	
	evalua:function(x){
		var i=0;
		var values=this.values;
		while ((i<values.length)&&(values[i].x<x))i++;
	
		if (i==0) return values[i].y;
		if (i==values.length) return values[i-1].y;
		if (values[i].x==x) return values[i].y;
		return interpolacion(
			values[i-1].x,
			values[i].x,
			values[i-1].y,
			values[i].y, x);
	},
	operacion:function (cjto,fun){
		var val1=this.values;
		var val2=cjto.values;
		var indx1=1,indx2=1;
		var res=[{x:min(this.inicio(),cjto.inicio()),y:fun(val1[0].y,val2[0].y)}];
		// Empiezan en (0,y) !!!
	while ((indx1<val1.length)||(indx2<val2.length)){
			if ((indx2==val2.length)){
				var curr=val1[indx1++];
				res.push({x:curr.x,y:fun(curr.y,val2[val2.length-1].y)});
				continue;
			}

			if ((indx1==val1.length)){
				var curr=val2[indx2++];
				res.push({x:curr.x,y:fun(curr.y,val1[val1.length-1].y)});
				continue;
			}

			var ultimo=res[res.length-1].x;
	
			if (val1[indx1].x==val2[indx2].x){
				actual=val1[indx1].x;
				if (indx1<val1.length)indx1++;
				if (indx2<val2.length)indx2++;
			}else if (val1[indx1].x<val2[indx2].x){
				actual=val1[indx1].x;
				if (indx1<val1.length) indx1++;
			}else{
				actual=val2[indx2].x;
				if (indx2<val2.length) indx2++;
			}
			var subint=interseccion(
									ultimo,actual,
									this.evalua(ultimo),this.evalua(actual),
									cjto.evalua(ultimo),cjto.evalua(actual),fun);

			for (var i=1; i<subint.length;i++){
					// el primero esta repetido
					res.push(subint[i]);
			}
		}
			var cres=new Conjunto();
			cres.setValues(res);
		return cres;
	},
	interseccion:function(cjto){
		return this.operacion(cjto,min);
	},
	union:function(cjto){
		return this.operacion(cjto,max);
	},
	escalar:function(factor){
			var res=[];
			for (var i in this.values){
					v=this.values[i];
					res.push([v.x*factor,v.y*factor]);
			}
			return new Conjunto(res);	
	},
	truncar:function(valor){
			var cota=new Conjunto([[this.inicio(),valor],[this.final(),valor]]);
			return this.interseccion(cota);
	},
	centroide:function(){
		var num=0;
		var den=0;
		for (var i =0; i<this.values.length;i++){
					num+=this.values[i].x*this.values[i].y;
					den+=this.values[i].y;
		}	
		if (isNaN(num/den)) return 0; // truncado en 0
		return num/den;
	}
}; 

var ConjuntoBorroso=function(values){
	this.Clase=Clase;
	this.Clase();	
	this.values=[];
	for (var v in values){
		this.values.push({x:values[v][0],y:values[v][1]});
	}
}

///////////////////////////////////////////////

function Conjunto(vector){
	this.ConjuntoBorroso=ConjuntoBorroso;
	this.ConjuntoBorroso(vector);
	this.extend(ConjuntoAbstracto);
}

var Funciones={
"and":function(c1,c2){
		return min(c1.max(),c2.max());
},
"or":function(c1,c2){
		return max(c1.max(),c2.max());
},
"not":function(c1,c1){
		return 1-c1.max();
}}


function T(op,t1,t2){

							this.op=op;
							this.t=[t1]
							if (t2) this.t[1]=t2;
				this.evaluar=function(variables,hechos){
					// Devuelve un valor
					var v=[];
					for (var i=0;i<this.t.length;i++){
						if (this.t[i].evaluar){
							v[i]=this.t[i].evaluar(hechos);
						}else{
							// El conjunto asociado
							// O el conjunto nulo...
							try{
							v[i]=variables[this.t[i].o][this.t[i].a];
							}catch(e){alert([variables,this.t[i].o]); throw e;}

							for (var p in hechos){
							var h=hechos[p];
							if (this.t[i].o==h.o){
								var tmp=variables[this.t[i].o][this.t[i].a].interseccion
											(variables[h.o][h.a].escalar(h.v));
								v[i]=v[i].interseccion(tmp);
							 }
							}
						}
					}
					return Funciones[this.op](v[0],v[1]);
				}
				this.instanciar=function(valor){
					// devuelve una serie de hechos
					var v=[];
					for (var i=0;i<this.t.length;i++){
						if (this.t[i].instanciar){
							v[i]=this.t[i].instanciar(valor);
						}else{
							v[i]=oav(this.t[i].o,this.t[i].a,valor*this.t[i].v);
						}
					}
					return v;
			}

			this.texto=function(){
				if (this.t.length==1) return this.op+"("+this.t[0].texto()+")";
				return "(("+this.t[0].texto()+")"+this.op+"("+this.t[1].texto()+"))";
			}		
				
};
function R(a,c){
			this.a=a;this.c=c;
			this.aplicacion=function(variables,hechos){
				var valor=this.a.evaluar(variables,hechos);
				
				return this.c.instanciar(valor);
			}
			this.texto=function(){
				return this.a.texto()+"->"+this.c.texto();
			}		
	}

function MotorDeInferencia(v,r){
	var variables=v;
	var reglas=r;
	function anadir(nuevos,hechos){
		continuar=false;
		insertado=false;
		estable=true;	
		for (var i in nuevos){
			var n= nuevos[i];
			for (var j in hechos){
					var h=hechos[j];
					if ((h.o==n.o)&&(h.a==n.a)){
							//TODO: Estrategia a seguir??
							if (h.v!=n.v) estable=false;
							h.v=max(n.v,h.v);
							insertado=true; 
					}
			}
			if (!insertado){
					hechos.push(n);
					estable=false;
			}
		}
		return !estable;
	}
	this.tope=500;
	this.inferir=function(hechos){
		var nuevos=hechos;
		var continuar=true;
		var iter=0;
		while (continuar){
			continuar=false;
		for (var i in reglas){
				var r=reglas[i];
				nuevos=r.aplicacion(variables,hechos);
		
		  continuar=continuar||anadir(nuevos,hechos);
		}
			if ((iter++)>this.tope){
				alert("inestable");
			 return hechos;
			}
		}
		return hechos;
	}
	
	
}


///////////////////////////////////////////////////
