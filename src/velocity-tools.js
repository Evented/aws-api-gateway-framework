export function minify(template) {
	return template
		.replace(/[\n\t]/g, '')
		.replace(/\s*[:,()=+&|\\"]\s*/g, data => data.trim());
}

export const emptyTemplate = '##';

const double = '#set( $d = 0.0 )';

const item = `
	#foreach( $k in $i.keySet())
		#set( $e = $i[$k].entrySet().toArray()[0] )
		#set( $i[$k] = $e.value )
		#if( $e.key == 'N' )
			#set( $i[$k] = $d.parseDouble($i[$k]) )
		#elseif( $e.key == 'B' )
			#set( $i[$k] = $i[$k].replace('+', '-').replace('/', '_').replace('=', '') )
		#end
	#end
`;

export const responseItem = minify(`
	${double}
	#set( $i = $input.path('$').Item )
		${item}
	$input.json('$.Item')
`);

export const responseItemArray = minify(`
	${double}
	#foreach( $i in $input.path('$').Items )
		${item}
	#end
	$input.json('$.Items')
`);
