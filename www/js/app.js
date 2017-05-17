var app = angular.module('todoapp', ['ionic', 'ngCordova']);

app.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider.state('list', {
    cache: false,
    url: '/list',
    templateUrl: 'templates/lista.html'
  });

  $stateProvider.state('new', {
    url: '/new',
    pageTitle: 'Novo',
    templateUrl: 'templates/novo.html',
    controller: 'NovoCtrl'
  });

  $stateProvider.state('edit', {
    url: '/edit/:indice',
    pageTitle: 'Editar',
    templateUrl: 'templates/novo.html',
    controller: 'EditCtrl'
  });

  $stateProvider.state('login', {
    url: '/login',
    pageTitle: 'Login',
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl'
  });

  //$urlRouterProvider.otherwise('/login');
  $urlRouterProvider.otherwise('/list');

});

//intancia do banco aberto.
var db = null;

app.run(function($ionicPlatform, $cordovaSQLite) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

       cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }

    //Se estiver usando um app real (android, ios, etc)
    if(window.cordova){
      db = $cordovaSQLite.openDB({name: 'tarefas.db'});
      console.log('Banco criado no dispositivo.');
    }else{
      db = window.openDatabase('tarefas.db', '1', 'Tarefas db', 200000);
      console.log('Db criado no navegador.');
    }

    $cordovaSQLite.execute(db, 'create table if not exists tarefa (id integer primary key, texto text, concluida integer)')
    .then(function(){
      console.log('Tabela criada.');
    });

  });
});

app.controller('ListaCtrl', function($scope, $rootScope, $state, TarefaService, $ionicPopup) {

  // $scope.tarefas = TarefaWebService.lista();
 
  TarefaService.lista().then(function(dados) {
      $scope.tarefas = dados;
  });

  $scope.hold = function(indice){
    var confirmPopup = $ionicPopup.confirm({
     title: 'Atenção!',
     template: 'Deseja excluir este item?'
   });

   confirmPopup.then(function(res) {
     if(res) {
       TarefaService.apagar(indice).then(function(){
         $ionicPopup.alert(
          {
            title: 'Item deletado.',
            template: 'Sucesso!'
          }
         );
         TarefaService.lista().then(function(dados) {
            $scope.tarefas = dados;
         });        
       });
     };
   });
  };
 

  $scope.concluir = function(indice) {
    
    TarefaService.concluir(indice).then(function(){      
       TarefaService.lista().then(function(dados) {
        $scope.tarefas = dados;
      });
      
    });
  }

  $scope.editar = function(indice) {
    $state.go('edit', {indice : indice});
  }  

});


app.controller('NovoCtrl', function($scope, $state, TarefaService) {

  $scope.tarefa = {
        "texto": '',
        "concluida": 0
  };

  $scope.salvar = function() {

    TarefaService.inserir($scope.tarefa).then(function() {
      $state.go('list'); 
    });
       
  }
});

app.controller('EditCtrl', function($scope, $state, $stateParams, TarefaService) {
  
  TarefaService.obtem($stateParams.indice).then(function(dados) {
    $scope.tarefa = dados;
  });

  $scope.salvar = function() {

    TarefaService.alterar($stateParams.indice, $scope.tarefa).then(function() {
      $state.go('list');
    });    
  }

});


app.factory('TarefaService', function($q, $cordovaSQLite) {

    return {

        lista: function() {
          var deferido = $q.defer();

          var query = 'SELECT * FROM tarefa';

          $cordovaSQLite.execute( db, query).then(function(dados){
            var tarefas = [];

            for(var i = 1; i < dados.rows.length; i++)
            {
              var tarefa = {
                 'id': dados.rows.item(i).id,
                 'texto': dados.rows.item(i).texto,
                 'concluida': dados.rows.item(i).concluida
              }

              tarefas.push(tarefa);
            }

            deferido.resolve(tarefas);
          });

          return deferido.promise;
        },

        obtem: function(indice) {
          var deferido = $q.defer();

          var query = 'SELECT * FROM tarefa WHERE id = (?)';

          $cordovaSQLite.execute(db, query, [indice]).then(function(dados){
            var tarefa = {
                'id': dados.rows.item(0).id,
                'texto': dados.rows.item(0).texto,
                'concluida': dados.rows.item(0).concluida
            }

            deferido.resolve(tarefa);
          });

          return deferido.promise;
        },

        inserir: function(tarefa) {
          var deferido = $q.defer();

          var query = 'INSERT INTO tarefa (texto, concluida) VALUES (?,?) ';

          $cordovaSQLite.execute(db, query, [tarefa.texto, tarefa.concluida]).then(function(response){
            console.log('ID Criado ' + response.insertId);
            deferido.resolve();
          });

          return deferido.promise;
        },

        alterar: function(indice, tarefa) {
          var deferido = $q.defer();

          var query = 'UPDATE tarefa SET texto = ? WHERE id = ?';

          $cordovaSQLite.execute(db, query, [tarefa.texto, indice]).then(function(){
            deferido.resolve();
          });

          return deferido.promise;
        },

        concluir: function(indice) {
          var deferido = $q.defer();

          var query = 'UPDATE tarefa SET concluida = 1 WHERE id = (?)';

          $cordovaSQLite.execute(db, query, [indice]).then(function(){
            console.log('Item concluído.');
            deferido.resolve();
          });

          return deferido.promise;
        },

        apagar: function(indice) {
          var deferido = $q.defer();

          var query = 'DELETE FROM tarefa WHERE id = (?)';

          $cordovaSQLite.execute(db, query, [indice]).then(function(){
            console.log('Item deletado.');
            deferido.resolve();
          });

          return $q.promise;
        }

    }

});



// app.factory('TarefaService', function() {

//     var tarefas = JSON.parse(window.localStorage.getItem('db_tarefas') || '[]');

//     function persistir() {
//       window.localStorage.setItem('db_tarefas', JSON.stringify(tarefas));
//     }

//     return {

//         lista: function() {
//           return tarefas;
//         },

//         obtem: function(indice) {
//           return tarefas[indice];
//         },

//         inserir: function(tarefa) {
//           tarefas.push(tarefa);
//           persistir();
//         },

//         alterar: function(indice, tarefa) {
//           tarefas[indice] = tarefa;
//           persistir();
//         },

//         concluir: function(indice) {
//           tarefas[indice].feita = true;
//           persistir();
//         },

//         apagar: function(indice) {
//           tarefas.splice(indice, 1);
//           persistir();
//         }

//     }

// });