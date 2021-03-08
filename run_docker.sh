# CONTAINER=$(docker create --cpus 8 --rm -it --mount "type=bind,src=$(readlink -f ./),dst=/root/app/" -e DISPLAY=$DISPLAY ubuntu:node bash)
# CONTAINER=$(docker create --cpus 8 --rm -it -e DISPLAY=$DISPLAY ${1:+ -e UUID=$1} peers bash)
RAND0=$(( $RANDOM % 64 ))
RAND1=$(( $RANDOM % 64 + 64 ))
UUID=$(sed "${1:- ${RAND0}}q;d" test_uuids.txt)
TARG=$(sed "${2:- ${RAND1}}q;d" test_uuids.txt)
URL="host.docker.internal:54045"
printf "using UUID:  %s\n" "${UUID}"
printf "target UUID: %s\n" "${TARG}"
# CONTAINER=$(docker create --cpus 8 --rm -it -e UUID=${UUID} -p 9230:9230 -p 22:22 peers bash)
CONTAINER=$(docker create --cpus 8 --rm -it -e UUID="${UUID}" -e TARG="${TARG}" -e URL=${URL} -e USR=test -e PASS=test peers bash)

CP_FILES="install_clideps.sh client/ spiritCLI.js test_spirit_client.js"

for FILE in $CP_FILES; do
  src=$(readlink -f $FILE)
  docker cp $src ${CONTAINER:0:12}://root/app/
  echo "copied $src to container" 
done

docker start $CONTAINER
docker exec $CONTAINER bash -c "cd /root/app && ./install_clideps.sh"

docker cp ./package.json ${CONTAINER:0:12}://root/app/

# docker exec --detach $CONTAINER bash -c "node test_spirit_client.js"
