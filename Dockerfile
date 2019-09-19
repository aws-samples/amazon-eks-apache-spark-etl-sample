FROM openjdk:8 AS build

# Env variables
ENV SCALA_VERSION 2.11.12
ENV SBT_VERSION 1.2.8

# Install Scala
## Piping curl directly in tar
RUN \
curl -fsL https://downloads.typesafe.com/scala/$SCALA_VERSION/scala-$SCALA_VERSION.tgz | tar xfz - -C /root/ && \
echo >> /root/.bashrc && \
echo "export PATH=~/scala-$SCALA_VERSION/bin:$PATH" >> /root/.bashrc

# Install sbt
RUN \
curl -L -o sbt-$SBT_VERSION.deb https://dl.bintray.com/sbt/debian/sbt-$SBT_VERSION.deb && \
dpkg -i sbt-$SBT_VERSION.deb && \
rm sbt-$SBT_VERSION.deb && \
apt-get update && \
apt-get install sbt && \
sbt sbtVersion && \
mkdir project && \
echo "scalaVersion := \"${SCALA_VERSION}\"" > build.sbt && \
echo "sbt.version=${SBT_VERSION}" > project/build.properties && \
echo "case object Temp" > Temp.scala && \
sbt compile && \
rm -r project && rm build.sbt && rm Temp.scala && rm -r target && \
mkdir -p /spark/ && \
curl -fsL http://apache.mirror.iphh.net/spark/spark-2.4.4/spark-2.4.4-bin-hadoop2.7.tgz | tar xfz - -C /spark/ && \
rm /spark/spark-2.4.4-bin-hadoop2.7/jars/kubernetes-*-4.1.2.jar && \
wget https://repo1.maven.org/maven2/io/fabric8/kubernetes-model-common/4.4.2/kubernetes-model-common-4.4.2.jar -P /spark/spark-2.4.4-bin-hadoop2.7/jars/ && \
wget https://repo1.maven.org/maven2/io/fabric8/kubernetes-client/4.4.2/kubernetes-client-4.4.2.jar -P /spark/spark-2.4.4-bin-hadoop2.7/jars/ && \
wget https://repo1.maven.org/maven2/io/fabric8/kubernetes-model/4.4.2/kubernetes-model-4.4.2.jar -P /spark/spark-2.4.4-bin-hadoop2.7/jars/

# Define working directory
WORKDIR /opt/input

# Project Definition layers change less often than application code
COPY build.sbt ./

WORKDIR /opt/input/project
# COPY project/*.scala ./
COPY project/build.properties ./
COPY project/*.sbt ./

WORKDIR /opt/input
RUN sbt reload

# Copy rest of application
COPY . ./
RUN sbt clean assembly

FROM openjdk:8-alpine AS spark

ARG spark_home=/spark/spark-2.4.4-bin-hadoop2.7

RUN set -ex && \
    apk upgrade --no-cache && \
    apk add --no-cache bash tini libc6-compat gcompat linux-pam nss && \
    mkdir -p /opt/spark && \
    mkdir -p /opt/spark/work-dir && \
    touch /opt/spark/RELEASE && \
    rm /bin/sh && \
    ln -sv /bin/bash /bin/sh && \
    echo "auth required pam_wheel.so use_uid" >> /etc/pam.d/su && \
    chgrp root /etc/passwd && chmod ug+rw /etc/passwd

COPY --from=build ${spark_home}/jars /opt/spark/jars
COPY --from=build ${spark_home}/bin /opt/spark/bin
COPY --from=build ${spark_home}/sbin /opt/spark/sbin
COPY --from=build ${spark_home}/kubernetes/dockerfiles/spark/entrypoint.sh /opt/

FROM spark AS final

COPY --from=build /opt/input/target/scala-2.11/spark-on-eks-assembly-v1.0.jar  /opt/spark/jars

ENV SPARK_HOME /opt/spark

WORKDIR /opt/spark/work-dir

ENTRYPOINT [ "/opt/entrypoint.sh" ]
