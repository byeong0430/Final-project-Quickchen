const serv = require('./serv-helpers.js');
const { countClients, broadcastResos } = require('./socket-helpers.js');

// create empty objects to store socket client id and url
// from which requests were made. save admin data in a separate object
const clients = {}, admins = {};

module.exports = function setSocketServer(io, db) {
  // HANDLE SOCKET CONNECTION
  return io.on('connection', socket => {
    console.log(`${countClients(io)} CLIENT(S) CONNECTED`);

    // HANDLE SOCKET DISCONNECTION
    socket.on('disconnect', () => {
      console.log(`${countClients(io)} CLIENT(S) CONNECTED`);
    });

    // KEEP TRACK OF WEBSOCKET CLIENT ID AND FROM WHICH WHERE THEY CAME FROM
    // deconstruct socket object and save id and (referer without origin)
    const { id, request: { headers: { origin, referer } } } = socket;
    const path = referer.replace(origin, '');
    // if client is admin, save id and to "admin"
    if (path === '/admin') {
      admins[id] = { id };
    } else {
      // otherwise save it to "clients"
      clients[id] = { id };
    }

    // LOAD INITIAL RESERVATIONS
    socket.on('getReservations', () => {
      serv.getAllReservations(db)
        .then(data => { io.emit('loadReservations', data); })
        .catch(err => console.log(err));
    })

    socket.on('getReservationByResCode', data => {
      serv.getReservationByResCode(db, data)
        .then(data => { io.emit('loadReservation', data); })
        .catch(err => { console.log(err) });
    })

    socket.on('getCustomerByResCode', data => {
      serv.getReservationByResCode(db, data)
        .then(reso => {
          return serv.getCustomerByReservation(db, reso)
        })
        .then(custo => { io.emit('loadCustomer', custo); })
        .catch(err => { console.log(err) });
    })

    /// GET MENU
    socket.on('getMenu', () => {
      serv.getMenu(db)
        .then(menu => {
          //Specify which socket if necessary
          io.emit('returnedMenu', menu);
        })
        .catch(err => { console.log(err) });
    })


    //GET MENU ITEMS BY CATEGORY
    // socket.on('submitReservation', formData => {
    //   console.log('Server socket handling submit');
    //   serv.submitNewReservation(db, formData)
    //     .then(data => { io.emit('loadNewReservation', data); })
    //     .catch(err => {console.log(err)});
    // })

    // SUBMIT NEW RESERVATION
    socket.on('submitReservation', formData => {
      serv.submitNewReservation(db, formData)
        .then(data => {
          broadcastResos(io, socket, 'loadNewReservation', data, admins, false);
        })
        .catch(err => { console.log(err) });
    })

    // UPDATE EXISTING RESERVATION
    socket.on('updateReservation', formData => {
      serv.updateReservation(db, formData)
        .then(data => {
          broadcastResos(io, socket, 'loadChangedReservation', data, admins, false);
        })
        .catch(err => console.log(err));
    });

    // CANCEL RESERVATION
    socket.on('cancelReservation', formData => {
      serv.cancelReservation(db, formData)
        .then(data => {
          broadcastResos(io, socket, 'removeCancelledReservation', data, admins, true);
        });
    })

    // UPDATE RESERVATION STATUS BY ADMIN
    socket.on('updateReservationStatus', status => {
      serv.updateReservationStatus(db, status)
        .then(data => { io.emit('changeReservationStatus', data); })
        .catch(err => console.log(err));
    })

    socket.on('getAllMenuItemOrders', status => {
      serv.getAllMenuItemOrders(db)
        .then(data => { io.emit('AllMenuItemOrders', data); })
        .catch(err => console.log(err));
    })

    socket.on('getItemOrdersWMenuItemInfo', status => {
      serv.getItemOrdersWMenuItemInfo(db)
        .then(data => { io.to(socket.id).emit('ItemOrdersWMenuItemInfo', data) })
        .catch(err => console.log(err));
    })

    socket.on('removeOrderItem', orderItem => {
      serv.removeOrderItem(db, orderItem)
        .then(deletedOrderItem => {
          io.emit('deletedOrderItem', deletedOrderItem);
        })
    })

    socket.on('addItemToOrder', status => {
      serv.addItemOrderWMenuItem(db, status)
        .then(data => { io.to(socket.id).emit('newOrderAdded', data); })
        .catch(err => console.log(err));
    })

    socket.on('placeOrder', order => {
      serv.updateOrderStatus(db, order)
        .then(data => {
          console.log("SOCKSERV DATA: ", data);
          io.to(socket.id).emit('orderPlaced', data[0]);
          // TODO NEEDS TO SEND MESSAGE TO ADMIN TOO
        })
        .catch(err => { console.log(err) })
    })


    socket.on("cancelOrder", order => {
      serv.cancelOrder(db, order)
        .then(data => {
          io.to(socket.id).emit('orderCancelled', data[0]);
          // TODO NEEDS TO SEND MESSAGE TO ADMIN TOO
        })
        .catch(err => { console.log(err) })
    })


  })
};