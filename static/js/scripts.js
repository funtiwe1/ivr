
$('#submit2').click(function(){
console.log('dddd');
let phone = $('#phone').val();
$.post({

//url:'js/ajax.js',
url:'/ajax',
dataType:'json',
data:{number:phone},
success: function(data,textStatus) {console.log(testStatus,data)}
});
})
