# Lets Rock!

MongoDB docker : docker run -d -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD=pass1234 -e MONGO_INITDB_DATABASE=letsrock -p 27017:27017 mongo

RabbitMQ docker : sudo docker run -d -e RABBITMQ_ERLANG_COOKIE=1234567890 -p 5672:5672 -p 15672:15672 rabbitmq:3-management