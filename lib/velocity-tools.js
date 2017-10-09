'use strict';Object.defineProperty(exports,'__esModule',{value:true});exports.minify=minify;function minify(template){return template.replace(/[\n\t]/g,'').replace(/\s*[:,()=+&|\\"]\s*/g,data=>data.trim())}const emptyTemplate=exports.emptyTemplate='##';const double='#set( $d = 0.0 )';const item=`
	#foreach( $k in $i.keySet())
		#set( $e = $i[$k].entrySet().toArray()[0] )
		#set( $i[$k] = $e.value )
		#if( $e.key == 'N' )
			#set( $i[$k] = $d.parseDouble($i[$k]) )
		#elseif( $e.key == 'B' )
			#set( $i[$k] = $i[$k].replace('+', '-').replace('/', '_').replace('=', '') )
		#end
	#end
`;const responseItem=exports.responseItem=minify(`
	${double}
	#set( $i = $input.path('$').Item )
		${item}
	$input.json('$.Item')
`);const responseItemArray=exports.responseItemArray=minify(`
	${double}
	#foreach( $i in $input.path('$').Items )
		${item}
	#end
	$input.json('$.Items')
`);