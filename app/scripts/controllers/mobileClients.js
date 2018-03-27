'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:MobileClientsController
 * @description
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('MobileClientsController',
<<<<<<< HEAD
      function ($filter,
=======
    function ($scope,
              $filter,
>>>>>>> d6f297187b8f7bb0afab8f1ee16e832d03281da5
              $routeParams,
              Constants,
              DataService,
              ProjectsService) {

<<<<<<< HEAD
      var ctrl = this;
      ctrl.projectName = $routeParams.project;
      ctrl.emptyMessage = "Loading...";
      ctrl.alerts = {};
      ctrl.redirectUrl = "/project/" + ctrl.projectName + "/overview";
      ctrl.breadcrumbs = [
        {
          title: "Mobile Clients",
          link: "project/" + ctrl.projectName + "/browse/mobile-clients"
=======
      $scope.projectName = $routeParams.project;
      $scope.emptyMessage = "Loading...";
      $scope.alerts = {};
      $scope.imagesByDockerReference = {};
      $scope.redirectUrl = "/project/" + $scope.projectName + "/overview";
      $scope.breadcrumbs = [
        {
          title: "Mobile Clients",
          link: "project/" + $scope.projectName + "/browse/mobile-clients"
>>>>>>> d6f297187b8f7bb0afab8f1ee16e832d03281da5
        },
        {
          title: $routeParams.mobileclient
        }
      ];

      var watches = [];

      ProjectsService
        .get($routeParams.project)
        .then(_.spread(function(project, context) {
          ctrl.project = project;
          ctrl.projectContext = context;

          DataService.get(Constants.MOBILE_CLIENT_VERSION, $routeParams.mobileclient, context, { errorNotification: false }).then(
            // success
            function(mobileClient) {
              ctrl.loaded = true;
              ctrl.mobileClient = mobileClient;

              // If we found the item successfully, watch for changes on it
              watches.push(DataService.watchObject(Constants.MOBILE_CLIENT_VERSION, $routeParams.mobileclient, context, function(mobileClient, action) {
                if (action === "DELETED") {
                  ctrl.alerts["deleted"] = {
                    type: "warning",
                    message: "This mobile client has been deleted."
                  };
                }
                ctrl.mobileClient = mobileClient;
              }));
            },
            // failure
            function(e) {
              ctrl.loaded = true;
              ctrl.alerts["load"] = {
                type: "error",
                message: e.status === 404 ? "This mobile client can not be found, it may have been deleted." : "The mobile client details could not be loaded.",
                details: $filter('getErrorDetails')(e)
              };
            }
          );

          ctrl.$onDestroy('$destroy', function(){
            DataService.unwatchAll(watches);
          });
        }));
    });
