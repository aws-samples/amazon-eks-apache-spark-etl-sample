FROM openjdk:11-jdk-slim AS sbt

# Env variables
ENV SCALA_VERSION 2.12.14
ENV SBT_VERSION 1.5.5

# Install Scala
## Piping curl directly in tar
RUN \
    apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/cache/apt/* && \
    curl -fsL https://downloads.typesafe.com/scala/$SCALA_VERSION/scala-$SCALA_VERSION.tgz | tar xfz - -C /root/ && \
    echo >> /root/.bashrc && \
    echo "export PATH=~/scala-$SCALA_VERSION/bin:$PATH" >> /root/.bashrc

# Install sbt
RUN \
    curl -L -o sbt-$SBT_VERSION.deb https://repo.scala-sbt.org/scalasbt/debian/sbt-$SBT_VERSION.deb && \
    dpkg -i sbt-$SBT_VERSION.deb && \
    rm sbt-$SBT_VERSION.deb && \
    apt-get update && \
    apt-get install sbt && \
    sbt -Dsbt.rootdir=true sbtVersion


FROM sbt AS build

RUN \
echo "scalaVersion := \"${SCALA_VERSION}\"" > build.sbt && \
echo "sbt.version=${SBT_VERSION}" > project/build.properties && \
echo "case object Temp" > Temp.scala && \
sbt -Dsbt.rootdir=true compile && \
rm -r project && rm build.sbt && rm Temp.scala && rm -r target

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

# Use your own Spark base image built for AWS compatiblity here
FROM vgkowski/spark:v3.1.2 AS final

COPY --from=build /opt/input/target/scala-2.12/spark-eks-assembly-3.1.2.jar  /opt/spark/jars

ENV SPARK_HOME /opt/spark

WORKDIR /opt/spark/work-dir

ENTRYPOINT [ "/opt/entrypoint.sh" ]
