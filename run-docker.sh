# CONTAINER=$(docker create --cpus 8 --rm -it --mount "type=bind,src=$(readlink -f ./),dst=/root/app/" -e DISPLAY=$DISPLAY ubuntu:node bash)
CONTAINER=$(docker create --cpus 8 --rm -it -e DISPLAY=$DISPLAY ${1:+ -e UUID=$1} peers bash)

CP_FILES="install_clideps.sh src/ public/ client/ processIcons.js spiritCLI.js"

for FILE in $CP_FILES; do
  src=$(readlink -f $FILE)
  docker cp $src ${CONTAINER:0:12}://root/app/
  echo "copied $src to container" 
done

docker start $CONTAINER
docker exec $CONTAINER bash -c "cd /root/app && ./install_clideps.sh"

docker cp ./package.json ${CONTAINER:0:12}://root/app/
