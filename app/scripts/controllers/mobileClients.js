'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:MobileClientsController
 * @description
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('MobileClientsController',
    function ($scope,
              $filter,
              $routeParams,
              Constants,
              DataService,
              ProjectsService) {

      $scope.projectName = $routeParams.project;
      $scope.emptyMessage = "Loading...";
      $scope.alerts = {};
      $scope.imagesByDockerReference = {};
      $scope.redirectUrl = "/project/" + $scope.projectName + "/overview";
      $scope.breadcrumbs = [
        {
          title: "Mobile Clients",
          link: "project/" + $scope.projectName + "/browse/mobile-clients"
        },
        {
          title: $routeParams.mobileclient
        }
      ];

      var watches = [];

      ProjectsService
        .get($routeParams.project)
        .then(_.spread(function(project, context) {
          $scope.project = project;
          $scope.projectContext = context;

          DataService.get(Constants.MOBILE_CLIENT_VERSION, $routeParams.mobileclient, context, { errorNotification: false }).then(
            // success
            function(mobileClient) {
              $scope.loaded = true;
              $scope.mobileClient = mobileClient;

              // If we found the item successfully, watch for changes on it
              watches.push(DataService.watchObject(Constants.MOBILE_CLIENT_VERSION, $routeParams.mobileclient, context, function(mobileClient, action) {
                if (action === "DELETED") {
                  $scope.alerts["deleted"] = {
                    type: "warning",
                    message: "This mobile client has been deleted."
                  };
                }
                $scope.mobileClient = mobileClient;
              }));
            },
            // failure
            function(e) {
              $scope.loaded = true;
              $scope.alerts["load"] = {
                type: "error",
                message: e.status === 404 ? "This mobile client can not be found, it may have been deleted." : "The mobile client details could not be loaded.",
                details: $filter('getErrorDetails')(e)
              };
            }
          );

          $scope.$on('$destroy', function(){
            DataService.unwatchAll(watches);
          });
        }));
    });
